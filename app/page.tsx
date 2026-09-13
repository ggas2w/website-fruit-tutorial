import CidraLanding from "./components/CidraLanding";
import ProductShowcase from "./components/ProductShowcase";

export default function Home() {
  return (
    <>
      <CidraLanding />
      <ProductShowcase
        flavorId="apple"
        title="Sweet Apple"
        description="Sidre tradicional de maçã, com uma doçura leve e uma efervescência natural que refresca a cada gole."
      />
    </>
  );
}
