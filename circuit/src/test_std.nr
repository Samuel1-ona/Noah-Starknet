use dep::std;

fn main(x: Field) {
    let _h = std::hash::poseidon::bn254::hash_1([x]);
}
