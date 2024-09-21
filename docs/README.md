**rates-api v3.0.0** • [**Docs**](modules.md)

***

# zelcore-rates-api

A Service that supplies rates and market conversion for ZelCore assets to other currencies

## Requirements

Requires node version 10.0 and above

## Installation

Install npm dependencies with command:

```bash
npm install
```

## Usage

Start the service with command:

```bash
npm start
```

After the service has been started, you should be able to browse to it on port 3333.
Example: http://localhost:3333/rates

## Docker

```bash
docker run -e API_KEY=yourApiKey -p 4444:3333 zelcash/rates-api
```
