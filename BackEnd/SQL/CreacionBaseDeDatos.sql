-- Definición de ENUMs necesarios para el sistema.
-- Se crean solo si no existen para evitar errores al ejecutar varias veces.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estatus_acceso_enum') THEN
    CREATE TYPE estatus_acceso_enum AS ENUM ('activo', 'revocado');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estatus_reporte_enum') THEN
    CREATE TYPE estatus_reporte_enum AS ENUM ('pendiente', 'aprobado', 'rechazado');
  END IF;
END;
$$;

-- Tabla principal de usuarios. Contiene datos de identificación y el control de strikes.
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario       SERIAL PRIMARY KEY,
  nombre_completo  VARCHAR(100) NOT NULL,
  correo           VARCHAR(100) UNIQUE NOT NULL,
  celular          VARCHAR(20) UNIQUE,
  numero_control   VARCHAR(20) UNIQUE NOT NULL,
  estatus_acceso   estatus_acceso_enum NOT NULL DEFAULT 'activo',
  total_strikes    INT NOT NULL DEFAULT 0
);

-- Cada usuario puede tener un solo vehículo registrado.
-- La relación usa ON DELETE CASCADE para eliminar el vehículo si el usuario se elimina.
CREATE TABLE IF NOT EXISTS vehiculos (
  id_vehiculo  SERIAL PRIMARY KEY,
  id_usuario   INT NOT NULL UNIQUE,
  placa        VARCHAR(15) UNIQUE NOT NULL,
  modelo       VARCHAR(50),
  color        VARCHAR(30),
  CONSTRAINT fk_vehiculo_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- Reportes de infracciones enviados por los usuarios anónimos o revisores.
-- Guarda información de la placa detectada y el estado de aprobación.
CREATE TABLE IF NOT EXISTS reportes (
  id_reporte              SERIAL PRIMARY KEY,

  texto_placa_ingresado   VARCHAR(20) NOT NULL,
  url_foto_placa          VARCHAR(500) NOT NULL,
  url_foto_contexto       VARCHAR(500),
  comentarios             TEXT,

  estatus                 estatus_reporte_enum NOT NULL DEFAULT 'pendiente',

  fecha_reporte           TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  fecha_revision          TIMESTAMPTZ,

  es_placa_registrada     BOOLEAN,
  id_usuario_infractor    INT,

  CONSTRAINT fk_rep_usuario_infractor
    FOREIGN KEY (id_usuario_infractor)
    REFERENCES usuarios(id_usuario)
);

-- Agregar columna al reporte para asociarlo a un vehículo detectado.
ALTER TABLE reportes
  ADD COLUMN IF NOT EXISTS id_vehiculo INT;

-- Crear FK si aún no está registrada en la base.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_rep_vehiculo'
      AND table_name = 'reportes'
  ) THEN
    ALTER TABLE reportes
      ADD CONSTRAINT fk_rep_vehiculo
      FOREIGN KEY (id_vehiculo)
      REFERENCES vehiculos(id_vehiculo);
  END IF;
END;
$$;

-- Catálogo de tipos de infracción configurables por el sistema.
CREATE TABLE IF NOT EXISTS tipos_infraccion (
  id_tipo_infraccion SMALLINT PRIMARY KEY,
  codigo             TEXT UNIQUE NOT NULL,
  descripcion        TEXT NOT NULL
);

-- Semillas básicas utilizadas por el frontend para mostrar opciones.
INSERT INTO tipos_infraccion (id_tipo_infraccion, codigo, descripcion) VALUES
  (1, 'estacionamiento-prohibido', 'Estacionamiento en zona prohibida'),
  (2, 'doble-fila',                'Estacionamiento en doble fila'),
  (3, 'bloqueo-acceso',            'Bloqueo de acceso o salida'),
  (4, 'espacio-discapacidad',      'Uso indebido de espacio para discapacidad'),
  (5, 'obstruccion-vial',          'Obstrucción de vía de circulación'),
  (6, 'otro',                      'Otra infracción')
ON CONFLICT (id_tipo_infraccion) DO NOTHING;

-- Relación del reporte con el tipo de infracción detectado o seleccionado por el revisor.
ALTER TABLE reportes
  ADD COLUMN IF NOT EXISTS id_tipo_infraccion SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_reporte_tipo_infraccion'
      AND table_name = 'reportes'
  ) THEN
    ALTER TABLE reportes
      ADD CONSTRAINT fk_reporte_tipo_infraccion
      FOREIGN KEY (id_tipo_infraccion)
      REFERENCES tipos_infraccion(id_tipo_infraccion);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reporte_id_tipo_infraccion
  ON reportes(id_tipo_infraccion);

-- Trigger para actualizar strikes y estatus de acceso cuando cambia el estado del reporte.
-- La lógica está encapsulada en la función siguiente.
CREATE OR REPLACE FUNCTION actualizar_strikes_y_estatus()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id INT;
BEGIN
  IF NEW.id_usuario_infractor IS NULL THEN
    RETURN NEW;
  END IF;

  v_usuario_id := NEW.id_usuario_infractor;

  -- Incremento de strikes cuando un reporte pasa a aprobado.
  IF (OLD.estatus IS DISTINCT FROM 'aprobado')
     AND NEW.estatus = 'aprobado' THEN
    UPDATE usuarios
    SET total_strikes = total_strikes + 1
    WHERE id_usuario = v_usuario_id;
  END IF;

  -- Reversión de strikes cuando un reporte previamente aprobado es rechazado.
  IF OLD.estatus = 'aprobado'
     AND NEW.estatus = 'rechazado' THEN
    UPDATE usuarios
    SET total_strikes = GREATEST(total_strikes - 1, 0)
    WHERE id_usuario = v_usuario_id;
  END IF;

  -- Recalcular estatus_acceso según strikes.
  UPDATE usuarios
  SET estatus_acceso = CASE
    WHEN total_strikes >= 3 THEN 'revocado'::estatus_acceso_enum
    ELSE 'activo'::estatus_acceso_enum
  END
  WHERE id_usuario = v_usuario_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger se recrea para asegurar que apunta siempre a la versión más reciente de la función.
DROP TRIGGER IF EXISTS trg_actualizar_strikes_y_estatus ON reportes;

CREATE TRIGGER trg_actualizar_strikes_y_estatus
AFTER UPDATE OF estatus ON reportes
FOR EACH ROW
EXECUTE FUNCTION actualizar_strikes_y_estatus();

-- Función para vincular un reporte con un vehículo registrado en base a la placa ingresada.
CREATE OR REPLACE FUNCTION empatar_reporte_con_vehiculo(p_id_reporte INT)
RETURNS reportes AS $$
DECLARE
  r_reporte   reportes%ROWTYPE;
  r_match     RECORD;
BEGIN
  SELECT *
  INTO r_reporte
  FROM reportes
  WHERE id_reporte = p_id_reporte;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el reporte con id %', p_id_reporte;
  END IF;

  SELECT v.id_vehiculo, u.id_usuario
  INTO r_match
  FROM vehiculos v
  JOIN usuarios u ON u.id_usuario = v.id_usuario
  WHERE v.placa = r_reporte.texto_placa_ingresado;

  -- Caso sin coincidencia en la BD.
  IF NOT FOUND THEN
    UPDATE reportes
    SET
      es_placa_registrada  = FALSE,
      id_vehiculo          = NULL,
      id_usuario_infractor = NULL
    WHERE id_reporte = p_id_reporte
    RETURNING * INTO r_reporte;

    RETURN r_reporte;
  END IF;

  -- Coincidencia encontrada: ligar vehículo y usuario.
  UPDATE reportes
  SET
    es_placa_registrada  = TRUE,
    id_vehiculo          = r_match.id_vehiculo,
    id_usuario_infractor = r_match.id_usuario
  WHERE id_reporte = p_id_reporte
  RETURNING * INTO r_reporte;

  RETURN r_reporte;
END;
$$ LANGUAGE plpgsql;

-- Función usada por los revisores para aprobar un reporte.
-- Esto activa automáticamente el trigger de strikes.
CREATE OR REPLACE FUNCTION aprobar_reporte(p_id_reporte INT)
RETURNS reportes AS $$
DECLARE
  r_reporte reportes%ROWTYPE;
BEGIN
  UPDATE reportes
  SET
    estatus        = 'aprobado',
    fecha_revision = timezone('utc', now())
  WHERE id_reporte = p_id_reporte
  RETURNING * INTO r_reporte;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe el reporte con id %', p_id_reporte;
  END IF;

  RETURN r_reporte;
END;
$$ LANGUAGE plpgsql;

-- Crear bucket de almacenamiento “reportes” en Supabase si aún no existe.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'reportes') THEN
    PERFORM storage.create_bucket('reportes', TRUE);
  END IF;
END;
$$;

-- Políticas de acceso público (lectura y subida) limitadas al bucket reportes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'UsoLibreUpload'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "UsoLibreUpload"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'reportes');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'UsoLibreReadReportes'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "UsoLibreReadReportes"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'reportes');
  END IF;
END;
$$;

------------------------------------------------------------
-- FUNCIÓN: notificar_strike_email
-- Envía correo cuando un reporte pasa a estatus "aprobado"
------------------------------------------------------------
CREATE OR REPLACE FUNCTION notificar_strike_email()
RETURNS TRIGGER AS $$
DECLARE
  v_correo_usuario TEXT;
  v_resend_api_key TEXT := 're_Qh325JJE_EpNCMmk94f53ZaSKTWS3DsTR';
  v_asunto TEXT := '⚠️ Reporte Aprobado - Aviso de Strike';
  v_mensaje TEXT;
  v_motivo TEXT;
BEGIN
  IF (OLD.estatus IS DISTINCT FROM 'aprobado') AND (NEW.estatus = 'aprobado') THEN

    SELECT correo INTO v_correo_usuario
    FROM usuarios
    WHERE id_usuario = NEW.id_usuario_infractor;

    v_motivo := COALESCE(NEW.comentarios, 'Sin comentarios adicionales');

    IF v_correo_usuario IS NOT NULL THEN

        v_mensaje := '<strong>Hola.</strong><br>' ||
                     'Tu reporte sobre el vehículo <strong>' || NEW.texto_placa_ingresado || '</strong> ha sido aprobado.<br>' ||
                     '<strong>Motivo/Comentarios:</strong> ' || v_motivo || '<br><br>' ||
                     'Se ha sumado un strike a tu cuenta. Evita futuras infracciones.';

        PERFORM net.http_post(
            url := 'https://api.resend.com/emails',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_resend_api_key
            ),
            body := jsonb_build_object(
                'from', 'Johan Dev <no-reply@johandevsec.com>',
                'to', v_correo_usuario,
                'subject', v_asunto,
                'html', v_mensaje
            )
        );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------
-- TRIGGER: trigger_enviar_email_reporte
-- Llama a la función después de actualizar un reporte
------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_enviar_email_reporte ON public.reportes;

CREATE TRIGGER trigger_enviar_email_reporte
AFTER UPDATE ON public.reportes
FOR EACH ROW
EXECUTE FUNCTION notificar_strike_email();

