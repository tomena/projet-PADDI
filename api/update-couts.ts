const reponse = await fetch("/api/update-couts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifiant: userName,
      resultats,
    }),
  });
  
  const resultatAPI = await reponse.json();
  
  if (!reponse.ok || !resultatAPI.success) {
    throw new Error(
      resultatAPI.message || "Échec de la mise à jour des coûts."
    );
  }
  
  setMessage(resultatAPI.message);
