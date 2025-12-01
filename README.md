# EstacionaTEC

Plataforma de reportes anónimos para el uso indebido de los espacios de estacionamiento del Tec de Culiacán.

## Descripción general

EstacionaTEC es un sistema diseñado para que cualquier persona dentro del campus pueda reportar vehículos mal estacionados, ocupando lugares para personas con discapacidad o usando áreas que no les corresponden. La plataforma centraliza estos reportes, permite verificar la información mediante lectura automática de placas y gestiona sanciones (strikes) y bloqueos de acceso según reglas definidas.

El proyecto está dividido en varios módulos independientes para facilitar el desarrollo, mantenimiento y pruebas.

## Estructura del proyecto

El repositorio se encuentra organizado de la siguiente manera:

### Frontend

Aplicación web desarrollada con React + Vite.
Incluye las pantallas de reporte, consulta y administración.
Se conecta a Supabase para autenticación, almacenamiento de datos y llamadas a funciones RPC.

### Backend

Implementación lógica del lado del servidor.
Incluye microservicios en Python para lectura automática de placas, así como las funciones, triggers y lógica dentro de Supabase (PostgreSQL).

### Data

ejemplos de imagenes de carros y sus placas  ademas de etiquetado de imagenes y sus respectivos label 

### Documentación

Contiene los manuales, de documentacion de usuario final 
documentacion general y documentacion tecninca y de instalacion del sistema

### Demostración

Incluye una grabacion del funcionamiento del sistema.
evidencia del funcionamiento del sistema.

### Pruebas

Contiene pruebas hechas durante el desarrollo del proyecto, scripts de testing etc.

## Tecnologías principales

* React + Vite
* Supabase (PostgreSQL, Auth, Storage, RPC)
* Python (microservicio de lectura de placas mediante API externa)
* TailwindCSS (estilos del frontend)
* TypeScript
* Docker (opcional pero es la manera en la que se realizo el despliegue)

## Objetivo del proyecto

Facilitar el proceso de reporte de estacionamientos mal utilizados dentro del Tec de Culiacán, reduciendo tiempos de respuesta y automatizando la gestión de sanciones. El sistema permite:

* Registrar reportes de manera anónima
* Detectar placas automáticamente
* Asociar vehículos a usuarios
* Generar strikes de forma automática
* cambiar el estatus de acceso cuando se superan los límites definidos
* Mantener un historial completo de reportes y revisiones
