
const modules = {};

const knownDrivers = [ "mysql" ];

export default async ( { driver, ...config }, query ) => {

	if ( ! modules[ driver ] && knownDrivers.includes( driver ) ) {

		const importedDriver = await import( `./${driver}.js` ).then( i => i.default );

		// eslint-disable-next-line require-atomic-updates
		if ( ! modules[ driver ] ) modules[ driver ] = importedDriver;

	}

	return await modules[ driver ]( config, query );

};
