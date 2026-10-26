export class ForbiddenError extends Error {
  constructor(message = "Vous n'avez pas accès à cette ressource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Ressource introuvable.") {
    super(message);
    this.name = "NotFoundError";
  }
}
