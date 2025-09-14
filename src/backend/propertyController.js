if (!salePrice || isNaN(salePrice) || salePrice <= 0) {
  return res.status(400).json({ message: "Enter a valid price" });
}