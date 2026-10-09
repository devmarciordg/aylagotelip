FROM php:8.2-fpm-alpine

RUN apk add --no-cache libpng libjpeg-turbo libwebp \
 && apk add --no-cache --virtual .build libpng-dev libjpeg-turbo-dev libwebp-dev \
 && docker-php-ext-configure gd --with-jpeg --with-webp \
 && docker-php-ext-install pdo_mysql opcache gd \
 && apk del .build
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY composer.json ./
RUN composer install --no-dev --no-interaction --no-progress || true

COPY . .
RUN composer install --no-dev --no-interaction --no-progress
