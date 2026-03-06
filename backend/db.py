from __future__ import annotations

import asyncpg


async def create_pool(db_url: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(db_url, min_size=2, max_size=10)


async def ensure_schema(pool: asyncpg.Pool, schema_sql: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute(schema_sql)
