// scripts/migrate.ts
import * as readline from "readline";
import { promisify } from "util";
import { exec } from "child_process";
import { promisify as promisifyExec } from "util";

// Promisify exec
const execPromise = promisifyExec(exec);

// Configuração do readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify question
const question = (query: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    rl.question(query, (answer) => {
      if (answer === undefined) {
        reject(new Error("No answer provided"));
      } else {
        resolve(answer);
      }
    });
  });
};

async function runMigration() {
  try {
    // Pergunta ao usuário pelo nome do arquivo
    const filename = await question("Filename: ");
    const filePath = `./src/db/migrations/${filename}`;
    console.log(`Path: ${filePath}`);

    // Pergunta ao usuário se deve ser local ou remoto
    const environment = await question(
      'Executar como local ou remoto? (Digite "local" ou "remote"): '
    );
    const isLocal = environment.toLowerCase() === "local";

    // Define o comando com base na escolha do usuário
    const command = `bunx wrangler d1 execute lucia-d1 ${
      isLocal ? "--local" : "--remote"
    } --file="${filePath}"`;
    console.log(`Exacuting command: ${command}`);

    // Executa o comando
    const { stdout, stderr } = await execPromise(command);

    if (stdout) {
      // console.log(`Saída: ${stdout}`);
      console.log(`Success!`);
    }

    if (stderr) {
      console.error(`Erro: ${stderr}`);
    }
  } catch (error) {
    console.error("Erro trying to migrate:", error);
  } finally {
    rl.close();
  }
}

// Executa a função de migração
runMigration();
