# Usamos Node para construir
FROM node:18-alpine

# Carpeta de trabajo
WORKDIR /app

# Copiamos dependencias e instalamos
COPY package*.json ./
RUN npm install

# Copiamos todo el código
COPY . .

# Construimos la app (crea la carpeta dist)
RUN npm run build

# Instalamos un servidor web ligero
RUN npm install -g serve

# Exponemos el puerto 3000
EXPOSE 3000

# Arrancamos sirviendo la carpeta 'dist' en el puerto 3000
CMD ["serve", "-s", "dist", "-l", "3000"]