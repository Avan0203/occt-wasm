import { exec } from "child_process";

export function execAsync(command: string, options?: { cwd?: string }): Promise<string> {
    console.log(`>cd ${options?.cwd || process.cwd()}`);
    console.log(`>${command}`);
    return new Promise((resolve, reject) => {
        exec(command, { cwd: options?.cwd }, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                reject(error);
                process.exit(1);
            }
            console.log(stdout);    
            resolve(stdout);
        });
    });
}