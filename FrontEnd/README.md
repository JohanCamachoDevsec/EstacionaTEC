# Frontend — EstacionaTEC

Interfaz web para reportar vehículos, mostrar información general y administrar reportes.

## Descripción general

El frontend de EstacionaTEC es una aplicación web desarrollada con **React + Vite**.
Proporciona una interfaz sencilla para que cualquier persona pueda levantar reportes de vehículos mal estacionados y permite a los administradores revisar, aprobar o rechazar dichos reportes.

El sistema se conecta directamente con Supabase para almacenamiento, autenticación, lectura de datos y ejecución de funciones RPC.

## Páginas principales

El frontend cuenta con tres pantallas principales:

### Landing Page

Página inicial del sistema. Presenta una introducción al propósito de EstacionaTEC y la capacidad de levantar un reporte
### ReportForm

Formulario donde se levantan reportes de vehículos.
Permite:

* Capturar fotografías del vehículo.
* Ingresar o confirmar la placa detectada automáticamente.
* Seleccionar el tipo de infracción.
* Enviar el reporte de forma anónima.
* Validar datos antes de enviarlos a Supabase.

Esta página utiliza APIs del backend para el procesamiento de imágenes y reconocimiento de placas.

### Admin

Sección exclusiva para administradores.
Incluye:

* Lista de reportes pendientes, aprobados y rechazados.
* Función para aprobar o rechazar reportes (lo cual ejecuta el trigger automático de Supabase).
* Historial completo de actividad.

## Estructura del directorio

### src/

Contiene el código principal organizado en:

* **pages/**: LandingPage, ReportForm, Admin.
* **components/**: elementos reutilizables de la interfaz.
* **lib/supabaseClient.ts**: cliente configurado para Supabase.

### public/

Archivos estáticos visibles públicamente.

## Variables de entorno

El frontend utiliza las siguientes variables en `.env`:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* VITE_PLATE_API_URL=https://apiestacionatec.johandevsec.com
## Objetivo del frontend

Brindar una interfaz clara y accesible para realizar reportes de estacionamiento y permitir a los administradores gestionar el sistema de forma eficiente.