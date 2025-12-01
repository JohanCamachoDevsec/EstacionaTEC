# Backend — EstacionaTEC

Lógica del servidor, microservicios y scripts para la base de datos.

## Descripción general

El backend de EstacionaTEC contiene dos componentes principales:

1. **Microservicios y APIs** desarrollados para procesar información es decir  la lectura automática de placas.
2. **Scripts SQL** necesarios para clonar, configurar y mantener la estructura de la base de datos en Supabase.

Este módulo permite que el sistema gestione reportes, vehículos, usuarios, strikes, reglas automatizadas y procesos internos del proyecto.

## Estructura del backend

El directorio contiene las siguientes carpetas:

### APIS/

Incluye el código fuente de los microservicios y endpoints utilizados por el frontend y por otros procesos internos.
Entre sus funciones principales se encuentran:

* Lectura automática de placas mediante un algoritmo de vision artificial.

### SQL/

Contiene el script necesarios para construir la estructura de base de datos completa del proyecto.
Incluye:

* Definición de tablas: personas, vehículos, reportes, tipos de infracción.
* Índices y llaves foráneas.
* Triggers automáticos que actualizan strikes y estatus de acceso.
* Funciones RPC como `empatar_reporte_con_vehiculo` y `aprobar_reporte`.
* Script principal para clonar la base de datos en un nuevo proyecto Supabase.

Este directorio permite replicar fácilmente la base de datos para desarrollo, pruebas o despliegue.

## Tecnologías utilizadas

* Python para microservicios y APIs.
* PostgreSQL (vía Supabase) para la base de datos.
* Supabase RPC, triggers y storage.
* Integración con API de reconocimiento de placas.

## Cómo usar este backend

1. Configura tu proyecto de Supabase y obtén tus claves.
2. Ejecuta el script dentro de `sql/` para clonar la estructura de tablas y funciones.
3. Configura tus variables de entorno para las APIs.
4. Inicia los microservicios dentro de la carpeta `apis/`.
5. Conecta el frontend usando el cliente de Supabase.

## Objetivo de este módulo

Centralizar la lógica principal del sistema, automatizar tareas repetitivas, asegurar la integridad de los datos y permitir la comunicación entre los distintos componentes del proyecto.

