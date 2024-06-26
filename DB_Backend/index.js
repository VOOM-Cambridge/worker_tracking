import express from "express";
//import mysql from "mysql";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { format } from 'date-fns';

const app = express();
app.use(cors());
app.use(express.json());

const dbPromise = open({
  filename: './data/workerData.db',
  driver: sqlite3.Database
});


app.get("/", (req, res) => {
  res.json("hello");
});


app.get("/workerAll", async (req, res) => {
  try {
    const db = await dbPromise;
    const data = await db.all("SELECT * FROM WORKER");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/clearData", async (req, res) => {
  // updates all value (should be just one in the database)
  try{
    const db = await dbPromise;
    const queryUpdate = "DELETE FROM WORKER";
    await db.run(queryUpdate);
    res.json({ message: "Data cleared from WORKER" });
  } catch (err) {
    console.error("Error in /clearData:", err.message);
  }
});

app.get("/worker", async (req, res) => {
  try {
    const db = await dbPromise;
    const queryUpdate ="SELECT * FROM WORKER WHERE trim(IDNUM) LIKE (?)"
    const values = [req.body.id]
    const data = await db.all(queryUpdate, values);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/update", async (req, res) => {
  // updates all value (should be just one in the database)
  // try{
    const db = await dbPromise;
    const queryUpdate = "UPDATE WORKER SET STATUS = (?), TIME_LAST_ACTION = (?), TIME_WORKED = (?), TIME_WORKED_TODAY = (?) WHERE IDNUM = (?)";
    if(req.body != null){
    const currentDate = new Date();
    const stringDate = getDateDatabase(currentDate)
    const values = [
      req.body.status,
      stringDate,
      req.body.timeWorked,
      req.body.timeWorked,
      req.body.id
    ];
    await db.run(queryUpdate, values);
    res.json({ message: "Worker Status updated successfully" });
  } else {
    res.status(500).json({ error: "null data" });
  }
  // } catch (err) {
  //   console.error("Error in worker update:", err.message);
  //   res.status(500).json({ error: err.message });
  // }
});

const getDateDatabase = (date) => {
    console.log(date)
    const dateNew = new Date(date)
    const year = dateNew.getFullYear();
    const month = String(dateNew.getMonth() + 1).padStart(2, '0');
    const day = String(dateNew.getDate()).padStart(2, '0');
    const time = String(dateNew.toLocaleTimeString())
    const formattedDate =format(dateNew, 'yyyy-MM-dd HH:mm:ss');
    //year + "-" + month + "-" + day + " " + time

    return formattedDate;
};

app.listen(8700, () => {
  console.log("Connected to backend.");
});
