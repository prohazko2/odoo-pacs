FROM prohazko/ric-node-pkg-builder:gzip as builder
LABEL stage=builder

WORKDIR /build

COPY . .

RUN pkg --target=host .
RUN gzexe ./odoo-pacs

# image
FROM alpine:3.12

ARG RIC_TOKEN
ARG RIC_OBJECT
ARG ODOO_URL
ARG SLACK_WEBHOOK_URL

ENV RIC_TOKEN=$RIC_TOKEN
ENV RIC_OBJECT=$RIC_OBJECT
ENV ODOO_URL=$ODOO_URL
ENV SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL

RUN apk update && \
  apk add --no-cache libstdc++ && \
  rm -rf /var/cache/apk/*

RUN touch ./.env

COPY --from=builder /bin/gzip /bin/
COPY --from=builder /build/odoo-pacs /odoo-pacs

CMD ["/odoo-pacs"]
