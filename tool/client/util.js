export const doDownload = (filename, {blob, data, mimeType}) => {
	if (blob && (data || mimeType)) throw new Error(`Either "blob" or "data" and "mimeType" must be specified!`);

	blob = blob || new Blob([data], {type: mimeType});

	const a = document.createElement("a");
	a.href = window.URL.createObjectURL(blob);
	a.download = filename;
	a.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true, view: window}));
	setTimeout(() => window.URL.revokeObjectURL(a.href), 100);
};

export const pDoDownloadZip = async (filename, fileMetas) => {
	const zip = new JSZip();
	fileMetas.forEach(({name, data}) => zip.file(name, data));
	await doDownload(filename, {blob: await zip.generateAsync({type: "blob"})});
};
