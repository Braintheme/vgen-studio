/** Base class for domain errors that carry a stable machine-readable code. */
export class VgenError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class RegistryError extends VgenError {}

export class TemplateDefinitionError extends VgenError {
  constructor(
    readonly templateId: string,
    readonly problems: readonly string[],
  ) {
    super('INVALID_TEMPLATE', `Template "${templateId}" is invalid:\n- ${problems.join('\n- ')}`);
  }
}
