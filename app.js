const express=require('express');
const app=express();
const router=require('express').Router();
require('dotenv').config();
const path=require('path');
const mysql=require('mysql'); 

app.use(express.urlencoded({extended:true}));
app.use(express.static(path.resolve(__dirname,"./assets/")));
app.use("/tours",express.static(path.resolve(__dirname,"./tours")));
app.use(router);

const db=mysql.createConnection(
    {
host:'localhost',
user:'root',
password:'',
database:'doc_app'

    }
);
db.connect((err)=>{
if(err){
    console.log(err)
}else{
    console.log('database connected success')
}
})


app.set('view engine','ejs');

router.get('/',(req,res)=>{
    res.render('index');
})

router.get('/about',(req,res)=>{
    res.render('about');
})

router.get('/services',(req,res)=>{
    res.render('services');
})

router.get('/contact',(req,res)=>{
    res.render('contact');
})

router.get('/register',(req,res)=>{
  db.query('SELECT * FROM catalogue', (err, results) => {
    if (err) throw err;
     // Filter duplicates based on 'cname'
     const uniqueItems = Array.from(new Map(results.map(item => [item.maincat, item])).values());
    res.render('register', { items: uniqueItems });
  });
});
   
app.get('/get-related-items/:id', (req, res) => {
  const selectedId = req.params.id;
  console.log(selectedId);
  // Replace this with your actual SQL query to fetch related items
  db.query('SELECT * FROM catalogue WHERE maincat = ?', [selectedId], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Server Error'); 
      }
      console.log(results);
      res.json(results); // Send results back as JSON
  });
});


router.get('/spinningMill', async (req, res) => {
  const query = 'SELECT DISTINCT subcat FROM cmp WHERE maincat = "Yarn-Spinning Mill"';

  try {
    // Execute the query to get unique subcategories
    const results = await new Promise((resolve, reject) => {
      db.query(query, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    // Check if results is an array and extract subcat values
    if (!Array.isArray(results)) {
      throw new Error("Expected results to be an array");
    }

    // Extract subcat values and filter out duplicates using a Set
    const categories = Array.from(new Set(results.map(row => row.subcat)));

    // You can now use the categories array for further processing
    const queries = categories.map(cat => `SELECT * FROM cmp WHERE subcat = "${cat}"`);

    // Fetch the user data based on the unique categories
    const userResults = await Promise.all(queries.map(query => new Promise((resolve, reject) => {
      db.query(query, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    })));

    // Remove duplicates from the user results if needed
    const uniqueUsersByCategory = Object.fromEntries(
      categories.map((cat, index) => [
        cat,
        userResults[index].filter((user, indexSelf, self) =>
          indexSelf === self.findIndex((t) => (
            t.cname === user.cname // Change based on your unique criteria
          ))
        )
      ])
    );

    res.render('spinningMill', { usersByCategory: uniqueUsersByCategory });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



 

app.post('/add', (req, res) => {
  const { cname, location, contact, web, email, item, relatedItems } = req.body;

  if (!item || !relatedItems) {
      console.log("Required field missing");
      return res.status(400).send('Required fields are missing');
  } else {
      const checkDuplicateQuery = `SELECT * FROM cmp WHERE email = ?`;
      db.query(checkDuplicateQuery, [email], (err, results) => {
          if (err) {
              console.error('Error checking duplicate:', err);
              return res.status(500).send('Server Error');
          }

          if (results.length > 0) {
              return res.send("<script>alert('Email already taken');window.location.href='/register';</script>");
          } else {
              const insertQuery = `INSERT INTO cmp (cname, location, contact, web, email, maincat, subcat) VALUES (?, ?, ?, ?, ?, ?, ?)`;
              const values = [cname, location, contact, web, email, item, relatedItems];

              db.query(insertQuery, values, (err, result) => {
                  if (err) {
                      console.error('Error registering:', err);
                      return res.status(500).send('Server Error');
                  }
                  res.send("<script>alert('Registered successfully');window.location.href='/register';</script>");
              });
          }
      });
  }
});


router.get('/json',(req,res)=>{
    res.json[{
        msg:"hello"
    }]
});


//app.use('./netlify/functions/api',router);
//module.exports.handler=serveless(app);
app.listen(process.env.PORT,()=>{console.log("Server is listening on "+process.env.PORT)});