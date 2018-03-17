###                        _       _
#__      _____  __ ___   ___  __ _| |_ ___
#\ \ /\ / / _ \/ _` \ \ / / |/ _` | __/ _ \
# \ V  V /  __/ (_| |\ V /| | (_| | ||  __/
#  \_/\_/ \___|\__,_| \_/ |_|\__,_|\__\___|
#
# Copyright © 2016 - 2018 Weaviate. All rights reserved.
# LICENSE: https://github.com/creativesoftwarefdn/weaviate/blob/develop/LICENSE.md
# AUTHOR: Bob van Luijt (bob@kub.design)
# See www.creativesoftwarefdn.org for details
# Contact: @CreativeSofwFdn / bob@kub.design
###

# Run from node:carbon
FROM node:carbon

# Set workdir
WORKDIR /usr/src/app

# Cope needed files
COPY package*.json ./
COPY weaviate-broker.js ./

# Set build args
ARG WEAVIATEHOST=localhost
ARG WEAVIATEPORT=80
ARG WEAVIATEURL=/weaviate/v1

# npm install
RUN npm install

# expose ports
EXPOSE 1883 8888

# run
CMD [ "node", "weaviate-broker.js", "--mqtt", "--websockets", "--debug=true" ]