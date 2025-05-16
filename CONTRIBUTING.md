# Contribution guidelines

## Prerequisites

- A Javascript/Typescript IDE with [Vue.js](https://vuejs.org/) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) support.
- A recent [Docker](https://docs.docker.com/engine/install/) installation.
- [Node.js v20+](https://nodejs.org/)

## Install dependencies

1. Install npm dependencies for all workspaces :

```sh
npm i
```

2. Build / Update the types based on schemas :

```sh
npm run build-types
```

## Start the development environment

```sh
npm run dev-zellij
```

*Note : This command will start a Zellij session with 4 panes, each one running a part of the project. You can also run the environment manually by running the commands below in 4 different terminals.*

<details>
<summary>Services</summary>

- **Dev dependencies** : `npm run dev-deps`
- **Api** : `npm run dev-api`
- **UI** : `npm run dev-ui`
- **Worker** : `npm run dev-worker`

</details>

## Stop the development environment

```sh
npm run stop-dev-deps
```

## Building the Docker images

```sh
docker build --progress=plain --target=main -t data-fair/catalogs:dev .
docker build --progress=plain --target=worker -t data-fair/catalogs/worker:dev .
```

## Running the tests

```sh
npm run test
```

## Zellij installation

<details>
<summary>Guide</summary>

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
*Tips :*

- Use <kbd>Ctrl</kbd> + <kbd>Q</kbd> to quit Zellij.
- Click on a panel, then use <kbd>Ctrl</kbd> + <kbd>C</kbd> then <kbd>Esc</kbd> to stop a terminal and regain access of the panel.

</details>
