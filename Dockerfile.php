FROM php:8.2-fpm-alpine

# Instalar extensões necessárias
RUN apk add --no-cache postgresql-client postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apk del postgresql-dev

# Configurar timezone
RUN echo "date.timezone = America/Sao_Paulo" >> /usr/local/etc/php/conf.d/timezone.ini

WORKDIR /usr/share/nginx/html
