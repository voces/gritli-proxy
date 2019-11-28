
import MySQL from "mysql2/promise.js";

const connections = {};

const configToConnectionKey = config => `${config.user}:${config.password}@${config.host}`;

const FLAGS = {
	AUTO_INCREMENT_FLAG: 512,
	BINARY_FLAG: 128,
	BINCMP_FLAG: 131072,
	BLOB_FLAG: 16,
	ENUM_FLAG: 256,
	EXPLICIT_NULL_FLAG: 134217728,
	FIELD_FLAGS_COLUMN_FORMAT: 33554432,
	FIELD_FLAGS_COLUMN_FORMAT_MASK: 67108864,
	FIELD_FLAGS_STORAGE_MEDIA: 22,
	FIELD_FLAGS_STORAGE_MEDIA_MASK: 16777216,
	FIELD_IN_ADD_INDEX: 1048576,
	FIELD_IN_PART_FUNC_FLAG: 524288,
	FIELD_IS_DROPPED: 67108864,
	FIELD_IS_MARKED: 268435456,
	FIELD_IS_RENAMED: 2097152,
	GET_FIXED_FIELDS_FLAG: 262144,
	GROUP_FLAG: 32768,
	MULTIPLE_KEY_FLAG: 8,
	NOT_NULL_FLAG: 1,
	NOT_SECONDARY_FLAG: 536870912,
	NO_DEFAULT_VALUE_FLAG: 4096,
	NUM_FLAG: 32768,
	ON_UPDATE_NOW_FLAG: 8192,
	PART_KEY_FLAG: 16384,
	PRI_KEY_FLAG: 2,
	SET_FLAG: 2048,
	TIMESTAMP_FLAG: 1024,
	UNIQUE_FLAG: 65536,
	UNIQUE_KEY_FLAG: 4,
	UNSIGNED_FLAG: 32,
	ZEROFILL_FLAG: 64,
};

const columnTypes = {
	0x00: "MYSQL_TYPE_DECIMAL",
	0x01: "MYSQL_TYPE_TINY",
	0x02: "MYSQL_TYPE_SHORT",
	0x03: "MYSQL_TYPE_LONG",
	0x04: "MYSQL_TYPE_FLOAT",
	0x05: "MYSQL_TYPE_DOUBLE",
	0x06: "MYSQL_TYPE_NULL",
	0x07: "MYSQL_TYPE_TIMESTAMP",
	0x08: "MYSQL_TYPE_LONGLONG",
	0x09: "MYSQL_TYPE_INT24",
	0x0a: "MYSQL_TYPE_DATE",
	0x0b: "MYSQL_TYPE_TIME",
	0x0c: "MYSQL_TYPE_DATETIME",
	0x0d: "MYSQL_TYPE_YEAR",
	0x0e: "MYSQL_TYPE_NEWDATE",
	0x0f: "MYSQL_TYPE_VARCHAR",
	0x10: "MYSQL_TYPE_BIT",
	0x11: "MYSQL_TYPE_TIMESTAMP2",
	0x12: "MYSQL_TYPE_DATETIME2",
	0x13: "MYSQL_TYPE_TIME2",
	0xf6: "MYSQL_TYPE_NEWDECIMAL",
	0xf7: "MYSQL_TYPE_ENUM",
	0xf8: "MYSQL_TYPE_SET",
	0xf9: "MYSQL_TYPE_TINY_BLOB",
	0xfa: "MYSQL_TYPE_MEDIUM_BLOB",
	0xfb: "MYSQL_TYPE_LONG_BLOB",
	0xfc: "MYSQL_TYPE_BLOB",
	0xfd: "MYSQL_TYPE_VAR_STRING",
	0xfe: "MYSQL_TYPE_STRING",
	0xff: "MYSQL_TYPE_GEOMETRY",
};

const columnTypeToSimpleType = {
	MYSQL_TYPE_BLOB: "string",
	MYSQL_TYPE_LONG: "number",
	MYSQL_TYPE_LONGLONG: "number",
	MYSQL_TYPE_STRING: "string",
	MYSQL_TYPE_VAR_STRING: "string",
};

const throwF = msg => {

	throw msg;

};

const cleanFields = fields => {

	let newFields = fields ?
		fields.map( field => Object.fromEntries(
			Object.entries( field )
				.filter( ( [ prop ] ) => ! prop.startsWith( "_" ) )
		) ) :
		fields;

	if ( newFields ) newFields = newFields.map( field => {

		const columnType = columnTypeToSimpleType[ columnTypes[ field.columnType ] ] ||
			throwF( `Missing type (${field.columnType}, ${columnTypes[ field.columnType ]})` );

		const flags = Object.entries( FLAGS )
			.filter( ( [ , value ] ) => field.flags & value )
			.map( ( [ flag ] ) => flag );

		return {
			columnType,
			persisted: flags.includes( "FIELD_FLAGS_STORAGE_MEDIA" ),
			name: field.name,
			nullable: ! flags.includes( "NOT_NULL_FLAG" ),
			primaryKey: flags.includes( "PRI_KEY_FLAG" ),
			uniqueKey: flags.includes( "UNIQUE_KEY_FLAG" ),
			multipleKey: flags.includes( "MULTIPLE_KEY_FLAG" ),
		};

	} );

	return newFields;

};

const appendResults = ( results, rows, fields ) => {

	if ( Array.isArray( rows ) )
		return results.push( { rows, fields: cleanFields( fields ) } );

	results.push( { modifications: rows } );

};

const defaultConfig = {
	multipleStatements: true,
	nestTables: "_",
};

export default async ( config, query ) => {

	const key = configToConnectionKey( config );
	if ( ! connections[ key ] )
		// TODO: timeout and kill the connection if unused
		connections[ key ] = await MySQL.createConnection( { ...defaultConfig, ...config } );

	const start = Date.now();
	let rows, fields, error;
	try {

		const result = await connections[ key ].query( query );
		rows = result[ 0 ];
		fields = result[ 1 ];

	} catch ( err ) {

		error = err;

	}

	const duration = Date.now() - start;

	if ( error ) return { error: error.message, duration };

	// If we did a select, fields are represented by an array; otherwise we don't have fields
	const multipleResults = Array.isArray( fields ) &&
        ( Array.isArray( fields[ 0 ] ) || fields[ 0 ] === undefined );

	const results = [];

	if ( multipleResults )
		for ( let i = 0; i < rows.length; i ++ )
			appendResults( results, rows[ i ], fields[ i ] );
	else appendResults( results, rows, fields );

	return { duration, results };

};
