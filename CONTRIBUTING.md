# Contribution guidelines

## Prerequisites

- A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
- A recent [Docker](https://docs.docker.com/engine/install/) installation.
- [Node.js v20+](https://nodejs.org/)

## Install dependencies

1) Install npm dependencies for all workspaces :

```sh
npm i
```

2) Pull images at first and then once in a while :

```sh
docker compose pull
```

3) Then run the containers :

```sh
npm run dev-deps
```

*Stop the containers with this command :*

```sh
npm run stop-dev-deps
```

## Working on @data-fair/catalogs/api

The API is a small [Express](https://expressjs.com) server.  
Run a development server (access it at http://localhost:8082/api/) :

```sh
npm run dev-api
```

## Working on @data-fair/catalogs/ui

The UI is a [Vue 3](https://vuejs.org/) project that uses [Vuetify 3](https://vuetifyjs.com/).  
Run a development server (access it at http://localhost:3039/) :

```sh
npm run dev-ui
```

## Working on types

Update the types based on schemas :

```sh
npm run build-types
```

## Building and running the Docker image

Build the images :

```sh
docker build --progress=plain --target=main -t data-fair/catalogs:dev .
```

## Running the tests

Run the test suite :

```sh
npm run test
```

## All-in-one development

You can run all services at once thanks to Zellij.

<details>
<summary>First time instructions</summary>

1) Install Rust's Cargo

```sh
curl https://sh.rustup.rs -sSf | sh
# choose 1 when prompted
```

2) Install Zellij

```sh
cargo install --locked zellij
```

3) Install NVM

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
nvm install
```

</details>

Run the Zellij command :

```sh
npm run dev-zellij
```

Access the running services at <http://localhost:5600/openapi-viewer>

*Tips :*

- Use <kbd>Ctrl</kbd> + <kbd>Q</kbd> to quit Zellij.
- Click on a panel, then use <kbd>Ctrl</kbd> + <kbd>C</kbd> then <kbd>Esc</kbd> to stop a terminal and regain access of the panel.
