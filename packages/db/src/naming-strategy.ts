import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const toSnake = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** Maps camelCase entity properties to snake_case table/column names. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? toSnake(targetName);
  }

  override columnName(propertyName: string, customName: string | undefined, prefixes: string[]): string {
    return toSnake(prefixes.concat(customName ?? propertyName).join('_'));
  }

  override relationName(propertyName: string): string {
    return toSnake(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return toSnake(`${relationName}_${referencedColumnName}`);
  }

  override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return toSnake(`${tableName}_${columnName ?? propertyName}`);
  }
}
