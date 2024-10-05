## True Network CLI

True Network's CLI is the entry point tool for developers to get started building. 

It provides with a set of core features required for initiating a new project, registering issuer & deploying algorithms.

## Quickstart

A simple guide to intergrate TRUE Network for giving on-chain attestations & building algorithms in existing dApps.

### Installation

Install the Reputation CLI:

```ts
  npm i -g reputation-cli
```

### Integrating True Network Project

Run the following command in the existing Node.JS or Next.JS project:

```ts
  reputation-cli init
```

Respond to the follow up questions to setup the config files for the project.

### Registering Issuer On-Chain

Get some testnet tokens by asking in the [True Network Community](https://at.truenetwork.io/community).

And then run the command below to register:

```ts
  reputation-cli register
```

> Congrats ✨ 
> The Project is registered successfully on-chain, now follow up the [docs](https://docs.truenetwork.io) to understand the detailed usage of the SDK.

## Local Setup

To install the CLI locally, use the following command:

```
  npm run install:local
```
It will uninstall the existing version of CLI and override by building the current state of project directory. 

Now, you can simply use the `reputation-cli` command from anywhere in the terminal.


## Contribution
We are appreciate communit contribution to the True Network protocol & it's developer tooling. There are many ways you can contribute & join the ecosystem:

- Building new applications & use-cases on top of True Network
- Fixing issues on the repositories
- Implmenting new features (Join the community to [discuss](https://at.truenetwork.io/community)).