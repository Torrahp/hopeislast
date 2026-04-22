import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const {Pool}  = pg

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect((err, client, release)=>{
    if(err){
        return console.error('Error connecting to the database:', err)
    }
    console.log('Connected to the database successfully')
    release()
})

export default pool;