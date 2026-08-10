import dns from "dns/promises";


console.log("DNS Servers:", dns.getServers());

try {
  const records = await dns.resolveSrv(
    "_mongodb._tcp.cluster0.reshztc.mongodb.net"
  );
  console.log(records);
} catch (err) {
  console.error(err);
}