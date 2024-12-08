// Importaciones
import express from "express";
const router = express.Router();
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';

import { config } from 'dotenv';
config();
// Configura la aplicación Express
const app = express();
app.use(cors({
  origin: ['https://pizzeria-nube.vercel.app/', 'http://localhost:3000/'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Permite credenciales
}));
app.use(express.json());
app.use(bodyParser.json());

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static('uploads'));

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_ROOT_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

// Convertir db.query a Promise
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// Conectar a la base de datos
db.connect(err => {
  if (err) {
    console.error("Error de conexión a MySQL:", err);
    process.exit(1);
  } else {
    console.log("Conectado a la base de datos MySQL");
  }
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ 
    message: "Error interno del servidor", 
    error: err.message 
  });
});

// Ruta de prueba
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});

// Ruta POST para agregar un nuevo usuario
app.post("/registro", async (req, res) => {
  try {
    const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
    const sql = "INSERT INTO usuarios (nombre, email, password, idrol, telefono, fecha_naci) VALUES (?, ?, ?, ?, ?, ?)";
    await query(sql, [nombre, email, password, idrol, telefono, fecha_naci]);
    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});


// Ruta de inicio de sesión (Login)
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const sql = "SELECT idusuario, email, idrol, nombre FROM usuarios WHERE email = ? AND password = ?";
    const results = await query(sql, [email, password]);
    
    if (results.length > 0) {
      const { idusuario, idrol, nombre } = results[0];
      res.json({ idusuario, idrol, nombre, message: "Inicio de sesión exitoso" });
    } else {
      res.status(401).json({ message: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});


// Nueva ruta para obtener todos los usuarios
app.get("/usuarios", (req, res) => {
  const query = "SELECT * FROM usuarios";
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Nueva ruta para crear un usuario
app.post("/usuarios", (req, res) => {
  const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
  const query = "INSERT INTO usuarios (nombre, email, password, idrol, telefono, fecha_naci) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(query, [nombre, email, password, idrol, telefono, fecha_naci], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor al crear usuario" });
    } else {
      res.status(200).json({ message: "Usuario creado exitosamente" });
    }
  });
});

// Nueva ruta para actualizar un usuario
app.put("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, idrol, telefono, fecha_naci } = req.body;
  const query = "UPDATE usuarios SET nombre = ?, email = ?, password = ?, idrol = ?, telefono = ?, fecha_naci = ? WHERE idusuario = ?";
  db.query(query, [nombre, email, password, idrol, telefono, fecha_naci, id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Usuario actualizado exitosamente" });
    }
  });
});

// Nueva ruta para eliminar un usuario
app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM usuarios WHERE idusuario = ?";
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Usuario eliminado exitosamente" });
    }
  });
});

// Endpoint GET para obtener datos de la base de datos
app.get("/productos", async (req, res) => {
  try {
    const { idcategoria, idoferta } = req.query;
    let sql = "SELECT * FROM productos";
    let values = [];

    if (idcategoria && idoferta) {
      sql += " WHERE idcategoria = ? AND idoferta = ?";
      values = [idcategoria, idoferta];
    } else if (idcategoria) {
      sql += " WHERE idcategoria = ?";
      values = [idcategoria];
    } else if (idoferta) {
      sql += " WHERE idoferta = ?";
      values = [idoferta];
    }

    const results = await query(sql, values);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', filename);
  res.sendFile(imagePath);
});

// Ruta para crear un nuevo producto
app.post("/productos", upload.single('imagen'), async (req, res) => {
  const { nombre, descripcion, tamano, precio, idcategoria, idoferta } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!nombre || !descripcion || !tamano || !precio || !idcategoria) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }
    
  const query = "INSERT INTO productos (nombre, descripcion, tamano, precio, idcategoria, idoferta, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)";
  const values = [nombre, descripcion, tamano, precio, idcategoria, idoferta, imagen];

  try {
    await new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Producto creado exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear el producto" });
  }
});

// Ruta PUT para actualizar un Producto
app.put('/productos/:id', upload.single('imagen'), (req, res) => {
  const producto_id = req.params.id;
  const { nombre, descripcion, tamano, precio, idcategoria, idoferta } = req.body;
  const imagen = req.file ? req.file.filename : null;

  let query = 'UPDATE productos SET nombre = ?, descripcion = ?, tamano = ?, precio = ?, idcategoria = ?, idoferta = ?';
  let values = [nombre, descripcion, tamano, precio, idcategoria, idoferta];

  if (imagen) {
    query += ', imagen = ?';
    values.push(imagen);
  }

  query += ' WHERE id_producto = ?';
  values.push(producto_id);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el producto' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un producto
app.delete('/productos/:id', (req, res) => {
  const producto_id = req.params.id;
  const query = 'DELETE FROM productos WHERE id_producto = ?';
  const values = [producto_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el producto' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  });
});

app.get("/productos/:id_producto", (req, res) => {
  const { id_producto } = req.params; // Captura el id del producto de la URL
  const query = "SELECT * FROM productos WHERE id_producto = ?";
  db.query(query, [id_producto], (err, results) => {
    if (err) {
      console.error("Error al obtener el producto:", err);
      return res.status(500).json({ error: "Error al obtener el producto" });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(results[0]); // Devuelve solo el primer producto encontrado
  });
});
app.post('/api/resena', (req, res) => {
  const { idusuario, id_producto, calificacion, comentario } = req.body;

  // Validación de datos
  if (!idusuario || !id_producto || !calificacion || !comentario) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  // SQL Query para insertar la reseña
  const query = `
    INSERT INTO resenas (idusuario, id_producto, calificacion, comentario, fecha)
    VALUES (?, ?, ?, ?, NOW())
  `;

  db.query(query, [idusuario, id_producto, calificacion, comentario], (err, result) => {
    if (err) {
      console.error('Error al insertar reseña:', err);  // Verifica el error en el servidor
      return res.status(500).json({ error: 'Error al guardar la reseña' });
    }

    res.status(201).json({ message: 'Reseña creada correctamente' });
  });
});


// Obtener todas las reseñas de un producto, incluyendo el nombre del usuario
app.get('/api/resenas/:id_producto', (req, res) => {
  const { id_producto } = req.params;

  const query = `
    SELECT resenas.id_resena, resenas.calificacion, resenas.comentario, resenas.fecha, usuarios.nombre AS nombre_usuario
    FROM resenas
    JOIN usuarios ON resenas.idusuario = usuarios.idusuario
    WHERE resenas.id_producto = ?
  `;

  db.query(query, [id_producto], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
    res.status(200).json(result); // Devuelve las reseñas con el nombre del usuario
  });
});

  // Ruta para obtener todos los roles
app.get('/roles', (req, res) => {
  const query = 'SELECT * FROM rol';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener roles:', err);
      res.status(500).json({ error: 'Error al obtener roles' });
      return;
    }
    res.json(results);
  });
});

//RUTA DE CATEGORIA

// Ruta GET categoria para obtener datos de la base de datos
app.get("/categoria", (req, res) => {
  const query = "SELECT * FROM categoria"; // Cambia "your_table_name" por el nombre de tu tabla

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error al obtener los datos" });
      return;
    }
    res.json(results);
  });
});


// Ruta para crear una nueva Categoria
app.post("/categoria", async (req, res) => { //async para permitir el uso de await dentro de esta función, facilitando el manejo de operaciones asincrónicas.
  const { nombre, descripcion, puntos } = req.body;

   // Verificar que todos los campos estén presentes y no sean null o undefined
if (!nombre || !descripcion || puntos === undefined ) {
  return res.status(400).json({ error: "Todos los campos (nombre, descripcion, puntos) son requeridos" });
}
  
  //Define la consulta SQL para insertar un nuevo producto en la base de datos. 
  const query = "INSERT INTO categoria (nombre, descripcion, puntos ) VALUES (?, ?, ?)"; //Usa signos de interrogación ? como marcadores de posición para los valores que serán insertados, lo que ayuda a prevenir inyecciones SQL.
  const values = [nombre, descripcion, puntos ]; // Prepara un array values con los valores a insertar, proporcionando null por defecto para descripcion y tamano si no están definidos.


  //Usa un bloque try-catch para manejar la ejecución de la consulta SQL.
  try {  //En el try, crea una nueva Promesa que ejecuta la consulta SQL. Si hay un error (err), la promesa se rechaza (reject(err)). Si la consulta es exitosa, la promesa se resuelve con los resultados (resolve(results)).
    await new Promise((resolve, reject) => { //Usa await para esperar la resolución de la Promesa antes de continuar.
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Categoria creada exitosamente" }); //Si la Promesa se resuelve correctamente, responde con un estado 201 y un mensaje de éxito en formato JSON.
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);  //Si ocurre un error durante la ejecución de la consulta, el bloque catch captura el error, lo registra en la consola y responde con un estado 500 y un error en formato json
  }
});


// Ruta PUT para actualizar una Categoria
app.put('/categoria/:id', (req, res) => {
  const idcategoria = req.params.id; // Obtener el id del producto de los parámetros de la URL
  const { nombre, descripcion, puntos } = req.body; // recuperar los datos del cuerpo de la solicitud

  if (puntos === undefined){
    return res.status(400).json({ error: "El campo 'puntos' es requerido para actualizar la categoría" });
  }

  const query = 'UPDATE categoria SET nombre = ?, descripcion = ?, puntos = ? WHERE idcategoria = ?'; // Consulta SQL para actualizar un registro
  const values = [nombre, descripcion, puntos, idcategoria]; // Valores a actualizar en la base de datos

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err); // Mensaje de error si la consulta SQL falla
      res.status(500).json({ error: 'Error al actualizar la categoria' }); // Responder con un error 500 si hay un problema
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'categoria no encontrado' }); // Responder con un error 404 si no se encuentra el producto
      return;
    }

    res.json({ message: 'categoria actualizado exitosamente' }); // Responder con un mensaje de éxito si la actualización fue exitosa
  });
});

// Ruta DELETE para eliminar un categoria
app.delete('/categoria/:id', (req, res) => {
  const idcategoria = req.params.id; // Obtener el id del producto de los parámetros de la URL

  const query = 'DELETE FROM categoria WHERE idcategoria = ?'; // Consulta SQL para eliminar un registro
  const values = [idcategoria]; // Valor del id del producto a eliminar

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err); // Mensaje de error si la consulta SQL falla
      res.status(500).json({ error: 'Error al eliminar la categoria' }); // Responder con un error 500 si hay un problema
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'categoria no encontrada' }); // Responder con un error 404 si no se encuentra el producto
      return;
    }

    res.json({ message: 'categoria eliminada exitosamente' }); // Responder con un mensaje de éxito si la eliminación fue exitosa
  });
});
  //PAQUETES
// Endpoint GET para obtener datos de la base de datos
app.get("/paquetes", (req, res) => {
  const query = "SELECT * FROM paquetes"; // Cambia "your_table_name" por el nombre de tu tabla

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error al obtener los datos" });
      return;
    }
    res.json(results);
  });
});

// Ruta para crear un nuevo paquete
app.post("/paquetes", async (req, res) => { //async para permitir el uso de await dentro de esta función, facilitando el manejo de operaciones asincrónicas.
  const { nombre, descripcion, categoria, precio, estado } = req.body;

   // Verificar que todos los campos estén presentes y no sean null o undefined
if (!nombre || !descripcion || !categoria || !precio || !estado) {
  return res.status(400).json({ error: "Todos los campos (nombre, descripcion, categoria, precio, estado) son requeridos" });
}
  
  //Define la consulta SQL para insertar un nuevo producto en la base de datos. 
  const query = "INSERT INTO paquetes (nombre, descripcion, categoria, precio, estado) VALUES (?, ?, ?, ?, ?)"; //Usa signos de interrogación ? como marcadores de posición para los valores que serán insertados, lo que ayuda a prevenir inyecciones SQL.
  const values = [nombre, descripcion, categoria, precio, estado]; // Prepara un array values con los valores a insertar, proporcionando null por defecto para descripcion y tamano si no están definidos.


  //Usa un bloque try-catch para manejar la ejecución de la consulta SQL.
  try {  //En el try, crea una nueva Promesa que ejecuta la consulta SQL. Si hay un error (err), la promesa se rechaza (reject(err)). Si la consulta es exitosa, la promesa se resuelve con los resultados (resolve(results)).
    await new Promise((resolve, reject) => { //Usa await para esperar la resolución de la Promesa antes de continuar.
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Producto creado exitosamente" }); //Si la Promesa se resuelve correctamente, responde con un estado 201 y un mensaje de éxito en formato JSON.
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);  //Si ocurre un error durante la ejecución de la consulta, el bloque catch captura el error, lo registra en la consola y responde con un estado 500 y un error en formato json
  }
});

  // Ruta PUT para actualizar un paquete
  app.put('/paquetes/:id', (req, res) => {
    const paquetes_id = req.params.id; // Obtener el id del producto de los parámetros de la URL
    const { nombre, descripcion, categoria, precio, estado } = req.body; // recuperar los datos del cuerpo de la solicitud

    const query = 'UPDATE paquetes SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, estado = ? WHERE id = ?'; // Consulta SQL para actualizar un registro
    const values = [nombre, descripcion, categoria, precio, estado, paquetes_id]; // Valores a actualizar en la base de datos

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error ejecutando la consulta:', err); // Mensaje de error si la consulta SQL falla
        res.status(500).json({ error: 'Error al actualizar el producto' }); // Responder con un error 500 si hay un problema
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'paquete no encontrado' }); // Responder con un error 404 si no se encuentra el producto
        return;
      }

      res.json({ message: 'paquete actualizado exitosamente' }); // Responder con un mensaje de éxito si la actualización fue exitosa
    });
  });

  // Ruta DELETE para eliminar un paquete
  app.delete('/paquetes/:id', (req, res) => {
    const paquetes_id = req.params.id; // Obtener el id del producto de los parámetros de la URL

    const query = 'DELETE FROM paquetes WHERE id = ?'; // Consulta SQL para eliminar un registro
    const values = [paquetes_id]; // Valor del id del producto a eliminar

    db.query(query, values, (err, result) => {
      if (err) {
        console.error('Error ejecutando la consulta:', err); // Mensaje de error si la consulta SQL falla
        res.status(500).json({ error: 'Error al eliminar el paquete' }); // Responder con un error 500 si hay un problema
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Paquete no encontrado' }); // Responder con un error 404 si no se encuentra el producto
        return;
      }

      res.json({ message: 'Paquete eliminado exitosamente' }); // Responder con un mensaje de éxito si la eliminación fue exitosa
    });
  });

  // Endpoint para crear un nuevo metodo de pago
app.post("/metpago", async (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre || !descripcion) {
    return res.status(400).json({ error: "Todos los campos (nombre, descripcion) son requeridos" });
  }

  const query = "INSERT INTO metodo_pago (nombre, descripcion) VALUES (?, ?)";
  const values = [nombre, descripcion];

  try {
    await new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Metodo de pago creado exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear el metodo de pago" });
  }
});

// Ruta PUT para actualizar un método de pago
app.put('/metpago/:id', (req, res) => {
  const metodoPagoId = req.params.id;
  const { nombre, descripcion } = req.body;

  const query = 'UPDATE metodo_pago SET nombre = ?, descripcion = ? WHERE id_metpago = ?';
  const values = [nombre, descripcion, metodoPagoId];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar el método de pago' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Método de pago no encontrado' });
      return;
    }

    res.json({ message: 'Método de pago actualizado exitosamente' });
  });
});

// Ruta DELETE para eliminar un método de pago
app.delete('/metpago/:id', (req, res) => {
  const metodoPagoId = req.params.id;

  const query = 'DELETE FROM metodo_pago WHERE id_metpago = ?';
  const values = [metodoPagoId];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar el método de pago' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Método de pago no encontrado' });
      return;
    }

    res.json({ message: 'Método de pago eliminado exitosamente' });
  });
});

//Ruta para crear nuevos recibos
app.post('/api/recibos', (req, res) => {
  const { id_cliente, fecha, monto_total, concepto, metod_pago, id_pedido, cant_pago, id_estadopago } = req.body;
  const sql = 'INSERT INTO recibos (id_cliente, fecha, monto_total, concepto, metod_pago, id_pedido, cant_pago, id_estadopago) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [id_cliente, fecha, monto_total, concepto, metod_pago, id_pedido, cant_pago, id_estadopago], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(201).send({ id: result.insertId, ...req.body });
  });
});

//Ruta para leer todos los recibos
app.get('/api/recibos', (req, res) => {
  const sql = 'SELECT * FROM recibos';
  db.query(sql, (err, results) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send(results);
  });
});

//Ruta para actualizar recibo
app.put('/api/recibos/:id', (req, res) => {
  const { id_cliente, fecha, monto_total, concepto, metod_pago, id_pedido, cant_pago, id_estadopago } = req.body;
  const sql = 'UPDATE recibos SET id_cliente = ?, fecha = ?, monto_total = ?, concepto = ?, metod_pago = ?, id_pedido = ?, cant_pago = ?, id_estadopago = ? WHERE id_recibo = ?';
  db.query(sql, [id_cliente, fecha, monto_total, concepto, metod_pago, id_pedido, cant_pago, id_estadopago, req.params.id], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ id: req.params.id, ...req.body });
  });
});

//Ruta para eliminar recibo
app.delete('/api/recibos/:id', (req, res) => {
  const sql = 'DELETE FROM recibos WHERE id_recibo = ?';
  db.query(sql, [req.params.id], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ message: 'Recibo eliminado' });
  });
});

// Ruta para crear nueva compra con múltiples productos
app.post('/api/compras', async (req, res) => {
  try {
    const { productos, idusuario } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0 || !idusuario) {
      return res.status(400).json({ 
        error: 'Se requiere al menos un producto y el ID de usuario para realizar la compra' 
      });
    }

    const values = productos.map(producto => [
      new Date(),
      producto.nombre,
      producto.cantidad,
      producto.total_compra, // Este ya viene con el descuento aplicado
      producto.imagen,
      idusuario,
      producto.idcategoria
    ]);

    const sql = 'INSERT INTO compras (fecha_compra, nombre_producto, cantidad, total_compra, imagen, idusuario, idcategoria) VALUES ?';
    
    await query(sql, [values]);
    res.status(201).json({ 
      message: 'Compra realizada exitosamente',
      productos: productos 
    });
  } catch (error) {
    console.error('Error al realizar la compra:', error);
    res.status(500).json({ 
      error: 'Error al realizar la compra', 
      details: error.message 
    });
  }
});

// Nueva ruta para obtener todos las compras
app.get("/compras", (req, res) => {
  const query = `
    SELECT compras.*, usuarios.nombre AS nombre_usuario, categoria.nombre AS nombre_categoria
    FROM compras
    JOIN usuarios ON compras.idusuario = usuarios.idusuario
    JOIN categoria ON compras.idcategoria = categoria.idcategoria
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Ruta para obtener las compras de un usuario específico
app.get('/api/compras/:idusuario', (req, res) => {
  const sql = 'SELECT * FROM compras WHERE idusuario = ? ORDER BY fecha_compra DESC';
  db.query(sql, [req.params.idusuario], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.status(200).send(results);
  });
});

//Ruta para actualizar la compra
app.put('/api/compras/:id', (req, res) => {
  const { id_compra, fecha_compra, nombre_producto, cantidad, precio, total_compra, categoria_producto } = req.body;
  const sql = 'UPDATE compras SET id_compra = ?, fecha_compra = ?, nombre_producto = ?, cantidad = ?, precio = ?, total_compra = ?, categoria_producto = ?, WHERE id_compra = ?';
  db.query(sql, [id_compra, fecha_compra, nombre_producto, cantidad, precio, total_compra, categoria_producto], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ id: req.params.id, ...req.body });
  });
});

//Ruta para eliminar compra
app.delete('/api/compras/:id', (req, res) => {
  const sql = 'DELETE FROM compras WHERE id_compras = ?';
  db.query(sql, [req.params.id], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ message: 'Compra eliminada' });
  });
});

// Ruta para agregar al carrito o actualizar si ya existe
app.post("/api/carrito/agregar", async (req, res) => {
  try {
    const { idproducto, nombre, cantidad, total, imagen, idusuario, idcategoria } = req.body;

    // Verificar usuario existente
    const userExists = await query("SELECT idusuario FROM usuarios WHERE idusuario = ?", [idusuario]);
    if (userExists.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el producto ya está en el carrito
    const existingProduct = await query(
      "SELECT * FROM carrito WHERE idproducto = ? AND idusuario = ?",
      [idproducto, idusuario]
    );

    if (existingProduct.length > 0) {
      // Actualizar cantidad y total
      const nuevaCantidad = existingProduct[0].cantidad + cantidad;
      await query(
        "UPDATE carrito SET cantidad = ?, total = ? WHERE idproducto = ? AND idusuario = ?",
        [nuevaCantidad, total, idproducto, idusuario]
      );
    } else {
      // Insertar nuevo producto
      await query(
        "INSERT INTO carrito (idproducto, nombre, cantidad, total, imagen, idusuario, idcategoria) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [idproducto, nombre, cantidad, total, imagen, idusuario, idcategoria]
      );
    }

    res.json({ message: "Producto agregado al carrito correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al agregar al carrito" });
  }
});


// Ruta para obtener el carrito de un usuario
app.get("/api/carrito/:idusuario", async (req, res) => {
  try {
    const { idusuario } = req.params;
    const results = await query("SELECT * FROM carrito WHERE idusuario = ?", [idusuario]);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el carrito" });
  }
});

// Ruta para actualizar el carrito (PUT)
app.put('/api/carrito/:idproducto', async (req, res) => {
  try {
    const { idproducto } = req.params;
    const { cantidad, idusuario, total } = req.body;

    // Actualizar carrito con el total recibido que ya incluye el descuento
    await query(
      'UPDATE carrito SET cantidad = ?, total = ? WHERE idproducto = ? AND idusuario = ?',
      [cantidad, total, idproducto, idusuario]
    );

    res.json({ 
      message: 'Producto actualizado en el carrito',
      total
    });
  } catch (error) {
    console.error('Error al actualizar producto en el carrito:', error);
    res.status(500).json({ message: 'Error interno al actualizar producto en el carrito' });
  }
});

// Ruta para eliminar un producto del carrito
app.delete('/api/carrito/:idproducto', (req, res) => {
  const { idproducto } = req.params;
  const { idusuario } = req.body;

  const deleteQuery = `DELETE FROM carrito WHERE idproducto = ? AND idusuario = ?`;
  db.query(deleteQuery, [idproducto, idusuario], (error, results) => {
    if (error) {
      console.error('Error al eliminar producto del carrito:', error);
      return res.status(500).json({ message: 'Error interno al eliminar producto del carrito' });
    }

    res.json({ message: 'Producto eliminado del carrito' });
  });
});

// Nueva ruta para vaciar el carrito
app.delete('/api/carrito/vaciar/:idusuario', (req, res) => {
  const sql = 'DELETE FROM carrito WHERE idusuario = ?';
  db.query(sql, [req.params.idusuario], (err, result) => {
    if (err) {
      res.status(500).json({ error: 'Error al vaciar el carrito', details: err.message });
      return;
    }
    res.status(200).json({ message: 'Carrito vaciado exitosamente' });
  });
});

//Ruta para crear un cupon

app.post('/api/cupones', (req, res) => {
  const { idcupon, nom_cupon, descripcion, descuento, inicio, expiracion, activo } = req.body;
  const sql = 'INSERT INTO cupones (idcupon, nom_cupon, descripcion, descuento, inicio, expiracion, activo) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  db.query(sql, [idcupon, nom_cupon, descripcion, descuento, inicio, expiracion, activo], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(201).send({ id: result.insertId, ...req.body });
  });
});

//Ruta para actualizar un cupon
app.put('/api/cupones/:idcupon', (req, res) => {
  const { nom_cupon, descripcion, descuento, inicio, expiracion, activo } = req.body; // No incluyas cuponid aquí
  const sql = 'UPDATE cupones SET nom_cupon = ?, descripcion = ?, descuento = ?, inicio = ?, expiracion = ?, activo = ? WHERE idcupon = ?';
  
  db.query(sql, [nom_cupon, descripcion, descuento, inicio, expiracion, activo, req.params.idcupon], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ id: req.params.idcupon, ...req.body });
  });
});

//Ruta para leer todos los cupones
app.get('/api/cupones', (req, res) => {
  const sql = 'SELECT * FROM cupones';
  
  db.query(sql, (err, results) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send(results);
  });
});


app.delete('/api/cupones/:idcupon', (req, res) => {
  const sql = 'DELETE FROM cupones WHERE idcupon = ?';
  
  db.query(sql, [req.params.idcupon], (err, result) => {
      if (err) {
          res.status(500).send(err);
          return;
      }
      res.status(200).send({ message: 'Cupon eliminada' });
  });
});

app.use(router);

app.get('/api/cupones-activos', (req, res) => {
  const sql = `
    SELECT 
      idcupon,
      nom_cupon,
      descripcion as description,
      descuento as discount,
      DATE_FORMAT(inicio, '%Y-%m-%d') as inicio,
      DATE_FORMAT(expiracion, '%Y-%m-%d') as expiration,
      activo,
      CASE 
        WHEN CAST(descuento AS SIGNED) >= 50 THEN 'bg-orange-500'
        WHEN CAST(descuento AS SIGNED) >= 30 THEN 'bg-blue-500'
        ELSE 'bg-green-500'
      END as bgColor
    FROM cupones 
    WHERE activo = 1 
    AND expiracion > CURDATE()`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error en la consulta SQL:', err);
      return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }

    try {
      console.log('Resultados de la consulta:', results);
      const formattedResults = results.map(coupon => ({
        idcupon: coupon.idcupon,
        nom_cupon: coupon.nom_cupon,
        description: coupon.description,
        discount: coupon.discount,
        expiration: coupon.expiration,
        activo: coupon.activo,
        bgColor: coupon.bgColor,
        img: '/assets/img/cuponImagen1.png'
      }));

      console.log('Resultados formateados:', formattedResults);
      res.status(200).json(formattedResults);
    } catch (error) {
      console.error('Error al procesar los resultados:', error);
      res.status(500).json({ error: 'Error al procesar los datos', details: error.message });
    }
  });
});

// Ruta para cupones disponibles
app.get('/api/cupones-disponibles/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const sql = `
      SELECT c.*, 
             IFNULL(uc.usado, 0) as usado
      FROM cupones c
      LEFT JOIN usuarios_cupones uc ON c.idcupon = uc.idcupon 
        AND uc.idusuario = ?
      WHERE c.activo = 1 
        AND c.expiracion >= CURDATE()
        AND (uc.usado IS NULL OR uc.usado = 0)
    `;
    
    const cupones = await query(sql, [userId]);
    res.json(cupones);
  } catch (error) {
    console.error('Error al obtener cupones disponibles:', error);
    res.status(500).json({ 
      message: 'Error al obtener cupones disponibles',
      error: error.message 
    });
  }
});

app.get('/api/cupones-activos', async (req, res) => {
  try {
    const sql = `
      SELECT 
        idcupon,
        nom_cupon,
        descripcion as description,
        descuento as discount,
        DATE_FORMAT(inicio, '%Y-%m-%d') as inicio,
        DATE_FORMAT(expiracion, '%Y-%m-%d') as expiration,
        activo,
        CASE 
          WHEN CAST(descuento AS SIGNED) >= 50 THEN 'bg-orange-500'
          WHEN CAST(descuento AS SIGNED) >= 30 THEN 'bg-blue-500'
          ELSE 'bg-green-500'
        END as bgColor
      FROM cupones 
      WHERE activo = 1 
      AND expiracion > CURDATE()
    `;
    
    const results = await query(sql);
    const formattedResults = results.map(coupon => ({
      ...coupon,
      img: '/assets/img/cuponImagen1.png'
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Error en la consulta de cupones activos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: error.message 
    });
  }
});

app.post('/usar-cupon', async (req, res) => {
  try {
    const { idcupon, idusuario } = req.body;
    
    // Verificar si ya existe una relación usuario-cupón
    const existingRelation = await query(
      'SELECT * FROM usuarios_cupones WHERE idcupon = ? AND idusuario = ?',
      [idcupon, idusuario]
    );

    if (existingRelation.length > 0) {
      await query(
        'UPDATE usuarios_cupones SET usado = 1 WHERE idcupon = ? AND idusuario = ?',
        [idcupon, idusuario]
      );
    } else {
      await query(
        'INSERT INTO usuarios_cupones (idcupon, idusuario, usado) VALUES (?, ?, 1)',
        [idcupon, idusuario]
      );
    }

    res.json({ success: true, message: 'Cupón aplicado correctamente' });
  } catch (error) {
    console.error('Error al usar el cupón:', error);
    res.status(500).json({ 
      message: 'Error al aplicar el cupón',
      error: error.message 
    });
  }
});

// Ruta para obtener todas las ofertas
app.get("/ofertas", (req, res) => {
  const query = "SELECT * FROM ofertas";
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Ruta para crear una oferta
app.post("/ofertas", (req, res) => {
  const { nombre, inicio, expiracion, descuento, activo } = req.body;
  const query = "INSERT INTO ofertas (nombre, inicio, expiracion, descuento, activo) VALUES (?, ?, ?, ?, ?)";
  db.query(query, [nombre, inicio, expiracion, descuento, activo], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor al crear oferta" });
    } else {
      res.status(201).json({ message: "Oferta creada exitosamente", id: results.insertId });
    }
  });
});

// Ruta para actualizar una oferta
app.put("/ofertas/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, inicio, expiracion, descuento, activo } = req.body;
  const query = "UPDATE ofertas SET nombre = ?, inicio = ?, expiracion = ?, descuento = ?, activo = ? WHERE idoferta = ?";
  db.query(query, [nombre, inicio, expiracion, descuento, activo, id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Oferta actualizada exitosamente" });
    }
  });
});

// Ruta para eliminar una oferta
app.delete("/ofertas/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM ofertas WHERE idoferta = ?";
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json({ message: "Oferta eliminada exitosamente" });
    }
  });
});

// Ruta para crear una membresía de PepperPoints para un usuario
app.post('/api/pepperpoints', (req, res) => {
  const { id_usuario, num_tarjeta } = req.body;
  const fechaActualizacion = new Date();

  const query = `INSERT INTO pepperpoints (id_usuario, total_puntos, fecha_actualizacion, num_tarjeta)
                 VALUES (?, 0, ?, ?)`;

  db.query(query, [id_usuario, fechaActualizacion, num_tarjeta], (err, result) => {
    if (err) {
      console.error('Error al crear la membresía de PepperPoints:', err);
      return res.status(500).json({ message: 'Error al crear la membresía de PepperPoints' });
    }
    res.status(201).json({ message: 'Membresía de PepperPoints creada con éxito' });
  });
});

// Ruta para obtener los PepperPoints de un usuario
app.get('/api/pepperpoints/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const query = `SELECT * FROM pepperpoints WHERE id_usuario = ?`;
  db.query(query, [id_usuario], (err, results) => {
    if (err) {
      console.error('Error al obtener los PepperPoints:', err);
      return res.status(500).json({ message: 'Error al obtener los PepperPoints' });
    }
    res.status(200).json(results[0]); // Devuelve los datos del usuario
  });
});

// Ruta para actualizar los PepperPoints de un usuario
app.put('/api/pepperpoints/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  const { puntos } = req.body;
  const fechaActualizacion = new Date();

  const query = `UPDATE pepperpoints SET total_puntos = total_puntos + ?, fecha_actualizacion = ? WHERE id_usuario = ?`;
  db.query(query, [puntos, fechaActualizacion, id_usuario], (err, result) => {
    if (err) {
      console.error('Error al actualizar los PepperPoints:', err);
      return res.status(500).json({ message: 'Error al actualizar los PepperPoints' });
    }
    res.status(200).json({ message: 'PepperPoints actualizados con éxito' });
  });
});

// Ruta para eliminar la membresía de PepperPoints de un usuario
app.delete('/api/pepperpoints/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const query = `DELETE FROM pepperpoints WHERE id_usuario = ?`;
  db.query(query, [id_usuario], (err, result) => {
    if (err) {
      console.error('Error al eliminar la membresía de PepperPoints:', err);
      return res.status(500).json({ message: 'Error al eliminar la membresía de PepperPoints' });
    }
    res.status(200).json({ message: 'Membresía de PepperPoints eliminada con éxito' });
  });
});

app.post('/api/pepperpoints/activar', (req, res) => {
  const { id_usuario } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ message: 'Se requiere un ID de usuario' });
  }

  // Crear un número de tarjeta virtual único (puedes generar uno al azar o con una lógica específica)
  const num_tarjeta = 'PP' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  const insertQuery = `
    INSERT INTO pepperpoints (id_usuario, total_puntos, fecha_actualizacion, num_tarjeta)
    VALUES (?, 0, NOW(), ?)
  `;

  db.query(insertQuery, [id_usuario, num_tarjeta], (err, results) => {
    if (err) {
      console.error('Error al activar la membresía:', err);
      return res.status(500).json({ message: 'Error al activar la membresía' });
    }

    res.status(201).json({ message: 'Membresía PepperPoints activada con éxito', num_tarjeta });
  });
});

// Ruta para canjear una pizza con PepperPoints
app.post('/api/pepperpoints/canjear', (req, res) => {
  const { idusuario, idproducto } = req.body;

  if (!idusuario || !idproducto) {
    return res.status(400).json({ error: 'Se requiere el ID de usuario y el ID del producto para canjear' });
  }

  // Primero, verificar si el producto es canjeable y los puntos necesarios
  const productoQuery = `
    SELECT p.id_producto, c.puntos_requeridos 
    FROM productos p 
    JOIN canjeables c ON p.id_producto = c.id_producto 
    WHERE p.id_producto = ? AND c.activo = 1
  `;

  db.query(productoQuery, [idproducto], (err, productoResult) => {
    if (err) {
      console.error('Error al obtener el producto canjeable:', err);
      return res.status(500).json({ error: 'Error al obtener el producto canjeable' });
    }

    if (productoResult.length === 0) {
      return res.status(404).json({ error: 'Producto no disponible para canjear' });
    }

    const puntosRequeridos = productoResult[0].puntos_requeridos;

    // Luego, obtener los puntos actuales del usuario
    const puntosQuery = 'SELECT total_puntos FROM pepperpoints WHERE id_usuario = ?';

    db.query(puntosQuery, [idusuario], (err, puntosResult) => {
      if (err) {
        console.error('Error al obtener los puntos del usuario:', err);
        return res.status(500).json({ error: 'Error al obtener los puntos del usuario' });
      }

      if (puntosResult.length === 0 || puntosResult[0].total_puntos < puntosRequeridos) {
        return res.status(400).json({ error: 'Puntos insuficientes para canjear este producto' });
      }

      // Actualizar los puntos del usuario
      const actualizarPuntosQuery = `
        UPDATE pepperpoints 
        SET total_puntos = total_puntos - ?, fecha_actualizacion = NOW() 
        WHERE id_usuario = ?
      `;

      db.query(actualizarPuntosQuery, [puntosRequeridos, idusuario], (err, updateResult) => {
        if (err) {
          console.error('Error al actualizar los puntos del usuario:', err);
          return res.status(500).json({ error: 'Error al actualizar los puntos del usuario' });
        }

        res.status(200).json({ message: 'Producto canjeado exitosamente', producto: productoResult[0] });
      });
    });
  });
});

// Ruta para crear un producto canjeable
app.post('/api/canjeables', (req, res) => {
  const { id_producto, puntos_requeridos, activo } = req.body;

  // Verificar si el producto ya existe en la tabla de canjeables
  const checkProductQuery = 'SELECT * FROM canjeables WHERE id_producto = ?';
  db.query(checkProductQuery, [id_producto], (err, results) => {
    if (err) {
      console.error('Error al verificar producto:', err);
      return res.status(500).json({ message: 'Error interno al verificar producto' });
    }

    if (results.length > 0) {
      // Si el producto ya existe, actualizar los puntos requeridos y el estado
      const updateQuery = 'UPDATE canjeables SET puntos_requeridos = ?, activo = ? WHERE id_producto = ?';
      db.query(updateQuery, [puntos_requeridos, activo, id_producto], (err, updateResults) => {
        if (err) {
          console.error('Error al actualizar producto canjeable:', err);
          return res.status(500).json({ message: 'Error interno al actualizar producto canjeable' });
        }
        res.status(200).json({ message: 'Producto canjeable actualizado correctamente' });
      });
    } else {
      // Si el producto no existe, agregarlo a la tabla de canjeables
      const insertQuery = 'INSERT INTO canjeables (id_producto, puntos_requeridos, activo) VALUES (?, ?, ?)';
      db.query(insertQuery, [id_producto, puntos_requeridos, activo], (err, results) => {
        if (err) {
          console.error('Error al agregar producto canjeable:', err);
          return res.status(500).json({ message: 'Error interno al agregar producto canjeable' });
        }
        res.status(201).json({ message: 'Producto canjeable agregado correctamente' });
      });
    }
  });
});

// Ruta para obtener todos los productos canjeables
app.get('/api/canjeables', (req, res) => {
  const query = 'SELECT * FROM canjeables';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener productos canjeables:', err);
      return res.status(500).json({ message: 'Error interno al obtener productos canjeables' });
    }
    res.status(200).json(results);
  });
});

// Ruta para eliminar un producto canjeable
app.delete('/api/canjeables/:id', (req, res) => {
  const { id } = req.params;

  const deleteQuery = 'DELETE FROM canjeables WHERE id_canjeable = ?';
  db.query(deleteQuery, [id], (err, results) => {
    if (err) {
      console.error('Error al eliminar producto canjeable:', err);
      return res.status(500).json({ message: 'Error interno al eliminar producto canjeable' });
    }
    res.status(200).json({ message: 'Producto canjeable eliminado correctamente' });
  });
});

// Ruta para actualizar un producto canjeable
app.put('/api/canjeables/:id', (req, res) => {
  const { id } = req.params;
  const { puntos_requeridos, activo } = req.body;

  const updateQuery = 'UPDATE canjeables SET puntos_requeridos = ?, activo = ? WHERE id_canjeable = ?';
  db.query(updateQuery, [puntos_requeridos, activo, id], (err, results) => {
    if (err) {
      console.error('Error al actualizar producto canjeable:', err);
      return res.status(500).json({ message: 'Error interno al actualizar producto canjeable' });
    }
    res.status(200).json({ message: 'Producto canjeable actualizado correctamente' });
  });
});

// Ruta para obtener los productos disponibles para canjear (solo los que están activos)
app.get('/api/canjeables/disponibles', (req, res) => {
  const query = `
    SELECT productos.*, canjeables.puntos_requeridos 
    FROM productos 
    JOIN canjeables ON productos.id_producto = canjeables.id_producto 
    WHERE canjeables.activo = 1
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener productos canjeables:', err);
      return res.status(500).json({ message: 'Error interno al obtener productos canjeables' });
    }
    res.status(200).json(results);
  });
});


// AQUI EMPIEZA RUTAS DE SEGUIMIENTE Y CREACION DE ORDENES

// RUTA QUE MANEJA LA LOGICA DE ORDENES ACTIVAS
// Endpoint para crear una nueva orden
app.post("/api/ordenes", (req, res) => {
  const { idusuario, total, estado, metodopago, direccionentrega, telefonocontacto } = req.body;

  // Validar que los datos necesarios estén presentes
  if (!idusuario || !total || !estado || !metodopago || !direccionentrega || !telefonocontacto) {
      return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  try {
      // Formatear la fecha correctamente para MySQL
      const ahora = new Date();
      const fechaFormateada = ahora.toISOString().slice(0, 19).replace('T', ' ');

      // Inserción en la tabla de órdenes
      db.query(
          'INSERT INTO ordenes (idusuario, total, estado, metodopago, direccionentrega, telefonocontacto, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [idusuario, total, estado, metodopago, direccionentrega, telefonocontacto, fechaFormateada, fechaFormateada],
          (error, resultados) => {
              if (error) {
                  console.error('Error al crear la orden:', error);
                  return res.status(500).json({ message: 'Error al crear la orden' });
              }

              const ordenId = resultados.insertId;
              return res.status(201).json({ message: 'Orden creada con éxito', idorden: ordenId });
          }
      );
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error al crear la orden' });
  }
});

// Obtener los detalles de una orden por ID
app.get('/api/ordenes/:idorden', (req, res) => {
  const { idorden } = req.params;

  // Validar que idorden es un número
  if (!Number.isInteger(parseInt(idorden))) {
      return res.status(400).json({ message: 'ID de orden no válido' });
  }

  // Consulta para recuperar la orden
  db.query('SELECT * FROM ordenes WHERE idorden = ?', [idorden], (error, resultados) => {
      if (error) {
          console.error('Error al recuperar la orden:', error);
          return res.status(500).json({ message: 'Error al recuperar la orden' });
      }

      // Si no se encontró la orden
      if (resultados.length === 0) {
          return res.status(404).json({ message: 'Orden no encontrada' });
      }

      // Retornar la orden encontrada
      return res.status(200).json(resultados[0]);
  });
})

// ENDPOINT DE LISTADO DE ORDENES DEL USUARIO
app.get('/api/ordenes', (req, res) => {
  const { userId } = req.query;

  // Validar que se haya proporcionado el ID de usuario
  if (!userId) {
    return res.status(400).json({ message: 'El ID de usuario es obligatorio' });
  }

  // Consulta a la base de datos
  db.query('SELECT * FROM ordenes WHERE idusuario = ?', [userId], (error, resultados) => {
    if (error) {
      console.error('Error al obtener las órdenes:', error);
      return res.status(500).json({ message: 'Error al obtener las órdenes' });
    }

    // Verificar si hay resultados
    if (resultados.length === 0) {
      return res.status(404).json({ message: 'No tienes órdenes registradas.' });
    }

    // Devolver las órdenes encontradas
    res.json(resultados);
  });
}); 

//RUTA PARA ACTUALIZAR LAS ETAPAS DE LA PIZZA

app.patch('/api/ordenes/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
      // Verifica que el estado sea uno válido
      const estadosValidos = ['Orden creada', 'Pedido recibido','En preparación', 'Listo para recoger en tienda', 'Entregado'];
      if (!estadosValidos.includes(estado)) {
          return res.status(400).json({ message: 'Estado no válido' });
      }

      // Actualiza la orden en la base de datos
      const [result] = await db.promise().query('UPDATE ordenes SET estado = ? WHERE idorden = ?', [estado, id]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Orden no encontrada' });
      }

      res.json({ message: 'Estado de la orden actualizado', estado });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al actualizar el estado de la orden' });
  }
});

app.delete("/api/ordenes/:id", (req, res) => {
  const { id } = req.params;
  const query = "DELETE FROM ordenes WHERE idorden = ?";

  // Usamos db.query con un callback de estilo tradicional
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error("Error al eliminar la orden:", err);
      res.status(500).json({ message: "Error al eliminar la orden" });
    } else if (results.affectedRows === 0) {
      // Si no se eliminó ninguna fila, la orden no existía
      res.status(404).json({ message: "Orden no encontrada" });
    } else {
      res.status(200).json({ message: "Orden eliminada exitosamente" });
    }
  });
});

app.get('/api/admin/ordenes', (req, res) => {
  // Aquí va el código para recuperar las órdenes de la base de datos
  db.query('SELECT * FROM ordenes', (error, resultados) => {
    if (error) {
      console.error('Error al obtener las órdenes:', error);
      return res.status(500).json({ message: 'Hubo un error al obtener las órdenes' });
    }

    if (resultados.length === 0) {
      return res.status(404).json({ message: 'No hay órdenes disponibles.' });
    }

    // Enviar las órdenes en formato JSON
    res.status(200).json(resultados);
  });
});

// Ruta para obtener todas las notificaciones
app.get("/notificaciones", (req, res) => {
  const query = "SELECT * FROM notificaciones";
  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Error en el servidor" });
    } else {
      res.status(200).json(results);
    }
  });
});

// Ruta para crear una nueva notificación
app.post("/notificaciones", upload.single('imagen'), async (req, res) => {
  const { nombre } = req.body;
  const imagen = req.file ? req.file.filename : null;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre es requerido" });
  }

  const query = "INSERT INTO notificaciones (nombre, imagen) VALUES (?, ?)";
  const values = [nombre, imagen];

  try {
    await new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
    res.status(201).json({ message: "Notificación creada exitosamente" });
  } catch (err) {
    console.error("Error ejecutando la consulta:", err);
    res.status(500).json({ error: "Error al crear la notificación" });
  }
});

// Ruta para actualizar una notificación
app.put('/notificaciones/:id', upload.single('imagen'), (req, res) => {
  const idnotificacion = req.params.id;
  const { nombre } = req.body;
  const imagen = req.file ? req.file.filename : null;

  let query = 'UPDATE notificaciones SET nombre = ?';
  let values = [nombre];

  if (imagen) {
    query += ', imagen = ?';
    values.push(imagen);
  }

  query += ' WHERE idnotificacion = ?';
  values.push(idnotificacion);

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al actualizar la notificación' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación actualizada exitosamente' });
  });
});

// Ruta para eliminar una notificación
app.delete('/notificaciones/:id', (req, res) => {
  const idnotificacion = req.params.id;

  const query = 'DELETE FROM notificaciones WHERE idnotificacion = ?';
  const values = [idnotificacion];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta:', err);
      res.status(500).json({ error: 'Error al eliminar la notificación' });
      return;
    }

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Notificación no encontrada' });
      return;
    }

    res.json({ message: 'Notificación eliminada exitosamente' });
  });
});




app.use(router);

// Inicia el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en http://localhost:${PORT}`);
});