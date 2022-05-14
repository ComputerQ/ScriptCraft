console.log("Starting Scriptcraft!");

import path from "path";
import fs from "fs";

import { spawn, fork } from "child_process";
import file from "./modules/file.js";

import { downloadLatest, canServerStart } from "./downloadmc.js";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
	await downloadLatest();

	//remove old Minecraft world
	fs.rmSync(path.join("./minecraft", "world"), { recursive: true, force: true });

	//copies clean Minecraft world
	file.cp(path.join("./minecraft", "world_clean"), path.join("./minecraft", "world"));

	let time = 0;
	while (!canServerStart()) {
		console.log(time + " Waiting for server to download...");
		await delay(1000);
		time++;
	}

	const server = spawn("java", ["-jar", "-Xms2G", "-Xmx2G", "server.jar"], { cwd: "./minecraft" });

	//hot reload
	let scriptcraft;
	const spawnScriptcraft = () => {
		scriptcraft = fork("./modules/scriptcraft.js");
		scriptcraft.alive = true;

		scriptcraft.on("message", (msg) => {
			server.stdin.write(msg.toString() + "\n");
		});

		scriptcraft.on("close", () => {
			scriptcraft.alive = false;
			scriptcraft.kill();
			spawnScriptcraft();
		});
	};

	spawnScriptcraft();

	fs.watch("./modules", () => {
		scriptcraft.kill();
	});

	server.stdout.on("data", (buffer) => {
		if (scriptcraft.alive) {
			scriptcraft.send(buffer.toString().replace("\n", ""));
		}
	});
})();
