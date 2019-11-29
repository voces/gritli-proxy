
import MySQL from "mysql2/promise.js";

const connections = {};

const configToConnectionKey = config => `${config.user}:${config.password}@${config.host}`;

const clean = data => {

	if ( Array.isArray( data ) ) return data.map( clean );
	if ( typeof data === "object" && data )
		return Object.fromEntries(
			Object.entries( data )
				.filter( ( [ key ] ) => ! key.startsWith( "_" ) )
				.map( ( [ key, value ] ) => [ key, clean( value ) ] ),
		);
	return data;

};

export default async ( config, query ) => {

	const key = configToConnectionKey( config );
	if ( ! connections[ key ] ) {

		// TODO: timeout and kill the connection if unused
		const connection = await MySQL.createConnection( config );

		// eslint-disable-next-line require-atomic-updates
		if ( ! connections[ key ] ) connections[ key ] = connection;

	}

	const start = Date.now();
	let data, error;
	try {

		data = await connections[ key ].query( query );

	} catch ( err ) {

		error = err;

	}

	const duration = Date.now() - start;

	if ( error ) return { error: error.message, duration };
	return { duration, data: clean( data ) };

};
