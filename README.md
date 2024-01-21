**Projeto Node.js com Kafka usando Docker - README**

Este é um projeto Node.js que inclui um consumidor Kafka e um endpoint para produzir mensagens. O projeto foi configurado para se conectar a um servidor Kafka executado no Docker.

### Pré-requisitos

1. Certifique-se de ter o [Docker](https://www.docker.com/) instalado em sua máquina.

### Configurando o Ambiente Kafka com Docker

1. Clone ou faça o download deste repositório.

2. Navegue até o diretório do projeto:

    ```bash
    cd caminho/do/seu/projeto
    ```

3. Execute o seguinte comando para iniciar os serviços Kafka e Zookeeper no Docker:

    ```bash
    docker-compose up -d
    ```

### Instalando Dependências do Projeto Node.js

1. Navegue até o diretório do projeto Node.js:

    ```bash
    cd caminho/do/seu/projeto/node
    ```

2. Instale as dependências utilizando o npm:

    ```bash
    npm install
    ```

### Criando um Tópico Kafka

1. Execute o seguinte comando para criar o tópico `test-topic`:

    ```bash
    docker exec -it <seu_container_kafka> kafka-topics.sh --create --topic test-topic --partitions 1 --replication-factor 1 --bootstrap-server localhost:9092
    ```

    Substitua `<seu_container_kafka>` pelo ID do container do Kafka, que você pode obter usando o comando `docker ps`.

### Rodando o Projeto Node.js

1. De volta ao diretório do projeto Node.js, execute o seguinte comando para iniciar o servidor:

    ```bash
    node index.js
    ```

    O servidor estará rodando em http://localhost:3000.

### Testando o Projeto

1. Use ferramentas como [Postman](https://www.postman.com/) ou [curl](https://curl.se/) para enviar mensagens para o Kafka:

    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"message": "Sua mensagem aqui"}' http://localhost:3000/produce
    ```

2. Verifique o console do servidor Node.js para ver mensagens sendo logadas.

### Encerrando o Ambiente Docker Kafka

Quando você terminar de usar o projeto, encerre os serviços do Docker usando o seguinte comando:

```bash
docker-compose down
