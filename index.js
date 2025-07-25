// const express = require("express"); ini pake cara lama
import express from "express"; // ini pake cara import
import { Pool } from "pg";
import bcrypt from "bcrypt";
import flash from "express-flash";
import session from "express-session";
import multer from "multer";
import path from "path";

const db = new Pool({
    user: "postgres",
    password: "root",
    host: "localhost",
    port: 5432,
    database: "b62-personal-web",
    max: 20,
});

// const db = new Pool({
//     connectionString:
//         "postgresql://neondb_owner:npg_2OciYpGE0lTA@ep-winter-firefly-a19elo70-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
//     ssl: {
//         rejectUnauthorized: false, // WAJIB agar koneksi SSL dari Neon tidak ditolak
//     },
// });

const app = express();
const port = 3000;

// =============================================================================================== //
app.use(express.json());
app.set("view engine", "hbs");
app.set("views", "src/views");

app.use("/assets", express.static("src/assets"));
app.use(express.urlencoded({ extended: false }));

app.use(
    session({
        secret: "secretKey",
        resave: false,  
        saveUninitialized: true
    })
);
app.use(flash());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './src/assets/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.get("/login", login);
app.post("/login", handleLogin);
app.get("/register", register);
app.post("/register", handleRegister);
app.get("/logout", handleLogout);

app.get("/", home);
app.post("/project", upload.single('image'), cardProject);
app.post("/update-project/:id", upload.single('image'), updateProject);
app.post("/delete-project/:id", deleteProject);

// =============================================================================================== //

async function home(req, res) {
    try {
        const result = await db.query("SELECT * FROM projects ORDER BY id DESC");
        let userData 

        if (req.session.user.name) {
            userData = { 
                name: req.session.user.name, 
                email: req.session.user.email,
                image: result.rows[0].image,
            };
        };

        const project = result.rows.map((project) => {
            return {
                ...project,
                duration: countDuration(project.start_date, project.end_date),
                formatStart: formatDate(project.start_date),
                formatEnd: formatDate(project.end_date),
            };
        });
        res.render("index", { project, userData });
    } catch (err) {
        console.log(err);
        res.send("gagal mengambil data");
    }
};

async function cardProject (req, res) {
    const { name, start_date, end_date, description } = req.body;

    // return console.log(req.file);

    const icon1 = req.body.icon1 ? true : false ;
    const icon2 = req.body.icon2 ? true : false ;
    const icon3 = req.body.icon3 ? true : false ;
    const icon4 = req.body.icon4 ? true : false ;
    // console.log({ name, start_date, end_date, description, icon1, icon2, icon3, icon4 });

    const query = `
        INSERT INTO projects(name, start_date, end_date, description, icon1, icon2, icon3, icon4, image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [name, start_date, end_date, description, icon1, icon2, icon3, icon4, req.file.filename];

    try {
        await db.query(query, values);
        res.redirect("/");
    } catch (err) {
        console.error("Insert failed:", err);
        res.status(500).send("Internal Server Error");
    }
};

async function deleteProject(req, res) {
    const { id } = req.params;

    const query = `
        DELETE FROM projects WHERE id = $1
    `;

    try {
        await db.query(query, [id]);
        res.redirect("/");
    } catch (err) {
        console.error("Delete failed:", err);
        res.status(500).send("Internal Server Error");
    }
};

async function updateProject(req, res) {
    const { id } = req.params;
    const { name, start_date, end_date, description } = req.body;
    const icon1 = req.body.icon1 ? true : false;
    const icon2 = req.body.icon2 ? true : false;
    const icon3 = req.body.icon3 ? true : false;
    const icon4 = req.body.icon4 ? true : false;
    const image = req.file ? req.file.filename : req.body.existingImage;    

    const query = `
        UPDATE projects
        SET name = $1,
            start_date = $2,
            end_date = $3,
            description = $4,
            icon1 = $5,
            icon2 = $6,
            icon3 = $7,
            icon4 = $8,
            image = $9
        WHERE id = $10
    `;

    const values = [name, start_date, end_date, description, icon1, icon2, icon3, icon4, image, id];

    try {
        await db.query(query, values);
        res.redirect("/");
    } catch (err) {
        console.error("Update failed:", err);
        res.status(500).send("Internal Server Error");
    }
};

function register(req, res) { 
    res.render("register", {message:req.flash("error")});
};

async function handleRegister(req, res) {  
    const { name, email, password } = req.body;

    const isRegistered = await db.query(
        `SELECT * FROM public.user WHERE email='${email}'`
    );
    // console.log(isRegistered.rows);
    
    if (isRegistered.rows.length > 0) {
        req.flash("error", "email sudah terdaftar");
        return res.redirect("/register")
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO public.user(email, password, name) VALUES ($1, $2, $3)`;
    await db.query(query, [email, hashedPassword, name]);
    res.redirect("/login");
};

function login(req, res) { 
    res.render("login", {message:req.flash("error")});
};

async function handleLogin(req, res) {
    const {email, password} = req.body;

    const isRegistered = await db.query(
        `SELECT * FROM public.user WHERE email='${email}'`
    );

    const isMatch = await bcrypt.compare(password, isRegistered.rows[0].password);
    if (!isMatch) {
        req.flash("error", "password salah")
        return res.redirect("/login")
    };

    req.session.user = {
        name:  isRegistered.rows[0].name,
        email: isRegistered.rows[0].email,
    }

    res.redirect("/")
};

function handleLogout(req, res) {
    req.session.destroy((err) => {
        if (err) {
        console.error("Logout failed:", err);
        return res.status(500).send("Logout error");
        }
        res.redirect("/login");
    });
};

// Function help 
const countDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
        return "Tanggal tidak valid";
    }

    if (end < start) {
        return "Tanggal akhir harus setelah tanggal mulai";
    }

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    // Koreksi jika hari negatif
    if (days < 0) {
        months--;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0); // hari terakhir bulan sebelumnya
        days += prevMonth.getDate();
    }

    // Koreksi jika bulan negatif
    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} tahun`);
    if (months > 0) parts.push(`${months} bulan`);
    if (days > 0) parts.push(`${days} hari`);
    if (parts.length === 0) return "0 hari"; // jika sama

    return parts.join(" ");
};

const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
};







// ===================================================== belajar ========================================================= //

// req => dari client(frontend) ke server(backend)
// res => dari server(backend) ke client(frontend)

app.get("/contact", (req, res) => {
    res.render("contact");
});

let data = [
    {
        id: 1,
        name: "adika",
    },
    {
        id: 2,
        name: "zikri",
    },
];

app.get("/home", async (req, res) => {
    const query = `SELECT * FROM humans`;
    const result = await db.query(query);
    res.render("dashboard", { result });
});

app.get("/portfolio/:id", (req, res) => {
    let { id } = req.params;

    let result = data.find((element) => element.id == id);

    res.render("portfolio", { result });
});
// app.get("/tugas8", home);
// function home(req, res) {
//     res.render("index");
// };
// app.get ini sama kaya yg diatas, cara penulisan yg diatas dibikin dalam bentuk lebih simpel
// get untuk render/route

let accounts = [];

app.post("/contact", async (req, res) => {
    // let name = req.body.name;
    // let password = req.body.password
    let { name, password } = req.body; //destructuring pemanggilan data
    console.log(name, password);

    let account = {
        name,
        password,
    };

    // accounts.push(account);
    const query = `INSERT INTO humans(name) VALUES ('${account.name}')`;
    // const query = `SELECT * FROM person`
    const result = await db.query(query);
    console.log(result.rows);

    res.redirect("/home");
});
// for untuk handle submit data

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
