// TODO(Future) junk copy-pastes from S.O.; replace this with `fs-extra` when those monkeys pull their finger out
//   and support ESM modules.
//   See: https://github.com/jprichardson/node-fs-extra/issues/746

import * as fs from "fs";
import * as path from "path";

function lsRecursiveSync (dir, fileList = []) {
	fs.readdirSync(dir).forEach(file => {
		fileList = fs.statSync(path.join(dir, file)).isDirectory()
			? lsRecursiveSync(path.join(dir, file), fileList)
			: fileList.concat(path.join(dir, file));
	});
	return fileList;
}

function removeSync (path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(file => {
			const curPath = `${path}/${file}`;
			if (fs.lstatSync(curPath).isDirectory()) removeSync(curPath);
			else fs.unlinkSync(curPath);
		});
		fs.rmdirSync(path);
	}
}

/**
 * @param src
 * @param dest
 * @param [opts]
 * @param [opts.isForce]
 * @param [opts.isDryRun]
 */
function copySync (src, dest, opts) {
	opts = opts || {};
	if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
		if (opts.isDryRun) console.log(`Creating directory ${dest}`);
		else fs.mkdirSync(dest, {recursive: true});

		fs.readdirSync(src).forEach(child => copySync(`${src}/${child}`, `${dest}/${child}`, opts));
	} else {
		if (opts.isForce) {
			if (opts.isDryRun) {
				console.log(`\tRemoving ${dest}`);
			} else {
				if (fs.existsSync(dest)) fs.unlinkSync(dest);
			}
		}

		if (opts.isDryRun) console.log(`\tCopying ${src} to ${dest}`);
		else fs.copyFileSync(src, dest);
	}
}

function readJsonSync (filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export {
	lsRecursiveSync,
	removeSync,
	copySync,
	readJsonSync,
};
