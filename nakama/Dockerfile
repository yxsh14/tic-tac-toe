FROM heroiclabs/nakama:3.22.0

COPY ./build/ /nakama/data/modules/build/

CMD ["nakama",
"--name", "nakama1",
"--database.address", "${DATABASE_ADDRESS}",
"--logger.level", "DEBUG"]
