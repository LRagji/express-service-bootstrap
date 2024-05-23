# express-service-bootstrap

This is a convenience package for starting a express based API server with

1. General API Security - (helmet based)
2. Health checks - K8S Health Probes
3. Process exits listners - Your API server should shutdown as gracefully as possible when it receives any shutdown signals from OS.
4. Include your API documentation - Swagger UI express.
5. Singleton DI container - possibly the best pattern to follow, yet completely flexible and ignoreable.
6. Creator pattern - dont use new keyword, this helps in writting better unit tests and mockable classes and features.

## Built with

1. Authors :heart: for Open Source.

## Contributions

1. New ideas/techniques are welcomed.
2. Raise a Pull Request.

## License

This project is contrubution to public domain and completely free for use, view [LICENSE.md](/license.md) file for details.
