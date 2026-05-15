import app from './app';

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`Research collaboration backend listening on port ${port}`);
});
