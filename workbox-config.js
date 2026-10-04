module.exports = {
	globDirectory: 'dist',
	globPatterns: [
		'**/*.{js,html,xml,txt,json,png,ico,jpg,webp,ttf}'
	],
	swDest: 'dist/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};