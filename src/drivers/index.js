
const modules = {};

export default async ( { driver, ...config }, query ) => {

	if ( ! modules[ driver ] )
		modules[ driver ] = await import( `./${driver}.js` ).then( i => i.default );

	return await modules[ driver ]( config, query );

};
