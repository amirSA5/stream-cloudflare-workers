import { Hono } from 'hono'
import { cors } from 'hono/cors';
import {v4 as uuidv4} from 'uuid';

type Context={
  Bindings :{
    STREAM_TODOS :KVNamespace;
     DB: D1Database;
  };
};

const app = new Hono<Context>()

app.use('/api/*', cors());

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/api/register', async c => {
  const { name, email,password } = await c.req.json()

  if (!name) return c.text("Missing name")
  if (!email) return c.text("Missing email")
  if (!password) return c.text("Missing password")

  const id = uuidv4();

  const { success } = await c.env.DB.prepare(`
    insert into users (id, name, email, password) values (?, ?, ?, ?)
  `).bind(id, name, email, password).run()

  if (success) {
    c.status(201)
    return c.text("Created")
  } else {
    c.status(500)
    return c.text("Something went wrong")
  }
})

app.post('/api/login', async c => {
  try {
    const { email, password } = await c.req.json();

    if (!email) return c.text("Missing email");
    if (!password) return c.text("Missing password");

    // Retrieve user from the database based on the provided email
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ? and password = ?").bind(email,password).run();

    if (user && user.results.length>0) {
      // Successful login
      return c.json({ status: 'ok', message: 'Login successful',user:user });
    } else {
      // Incorrect email or password
      c.status(401);
      return c.json({ status: 'error', message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    c.status(500);
    return c.json({ status: 'error', message: 'Something went wrong' });
  }
});


app.get('/todos',async (c)=>{
  const items= await c.env.STREAM_TODOS.list();
  const todos= await Promise.all(
      items.keys.map(({name})=>{c.env.STREAM_TODOS.get(name)})
    );
  return c.json(items);
})

app.get('api/todos/:user_id', async (c)=>{
  const userId=c.req.param('user_id');
  const { results } = await c.env.DB.prepare(`
    select * from todos where userId = ?
  `).bind(userId).all()
  return c.json(results);
})

app.post('api/todos/:user_id', async (c)=>{
  const id = uuidv4();
  const userId=c.req.param('user_id');
  const {title,description}= await c.req.json();

   const { success } = await c.env.DB.prepare(`
    insert into todos (id, userId, title, description) values (?, ?, ?, ?)
  `).bind(id, userId, title, description).run();

  if (success) {
    c.status(201)
    return c.text("Created")
  } else {
    c.status(500)
    return c.text("Something went wrong")
  }
  
})






export default app
