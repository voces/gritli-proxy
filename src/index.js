
import cors from "cors";
import express from "express";
import drivers from "./drivers/index.js";

const app = express();
const port = 3000;

app.use( cors() );

app.get( "/", async ( req, res, next ) => {

	const config = JSON.parse( req.query.config );
	const query = req.query.query;

	try {

		res.json( await drivers( config, query ) );

	} catch ( err ) {

		next( err );

	}

} );

// eslint-disable-next-line no-unused-vars
app.use( ( err, _1, res, _2 ) => {

	console.error( err );
	res.status( 400 ).send( err.message );

} );

app.listen( port, () => console.log( `Listening on port ${port}!` ) );
