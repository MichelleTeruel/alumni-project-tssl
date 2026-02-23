FROM php:8.2-fpm

RUN docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "-S", "0.0.0.0:8000", "-t", "/var/www/html", "router.php"]
