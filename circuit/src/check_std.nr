fn main(x: Field, y: Field) {
    let _ = std::poseidon::bn254::hash_2([x, y]);
}
