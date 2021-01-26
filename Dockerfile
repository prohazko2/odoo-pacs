FROM prohazko/ric-node-pkg-builder:gzip as builder
LABEL stage=builder

WORKDIR /build

COPY . .

RUN pkg --target=host .
RUN gzexe ./odoo-pacs

# image
FROM alpine:3.12

RUN apk update && \
  apk add --no-cache libstdc++ && \
  rm -rf /var/cache/apk/*

RUN touch ./.env

COPY --from=builder /bin/gzip /bin/
COPY --from=builder /build/odoo-pacs /odoo-pacs

CMD ["/odoo-pacs"]
