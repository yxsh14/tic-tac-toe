FROM heroiclabs/nakama:3.22.0

COPY ./build /nakama/data/modules/build
COPY ./local.yml /nakama/data/local.yml

EXPOSE 7350 7351

CMD ["sh", "-c", "nakama --config /nakama/data/local.yml --database.address \"$DATABASE_ADDRESS\" --logger.level DEBUG"]