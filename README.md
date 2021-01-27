# odoo-pacs

Simple project with [Rightech IoT](https://rightech.io/) and [Odoo](https://www.odoo.com/) Attendances module integration.  
[Habr Article (RU)](https://habr.com/ru/company/ric/blog/539374/)


## env

| var                        | example                                          |
| -------------------------- | ------------------------------------------------ |
| RIC_URL                    | https://dev.rightech.io/                         |
| RIC_TOKEN                  | eyJhbGciOiJIUzI...                               |
| RIC_OBJECT                 | 60009807a5284419c8000000                         |
| ODOO_URL                   | http://user:pass@127.0.0.1:8069/dbname           |
| SLACK_WEBHOOK_URL          | https://hooks.slack.com/services/xxxxx/xxxx/xxxx |

## src

| file                       | description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| [index.js](index.js)       | entrypoint                                                          |
| [src/pacs.js](src/pacs.js) | connect to Rightech IoT WebSocket API, listen for attendance events |
| [src/odoo.js](src/odoo.js) | Odoo XML RPC wrap                                                   |

## run

Install NPM dependencies

```bash
$ npm install
```

Run service

```bash
$ npm start
```
