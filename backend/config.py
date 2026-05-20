from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "mysql+pymysql://root@localhost/osso"
    secret_key: str = "change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    web3_provider_url: str = "http://127.0.0.1:8545"
    osso_registry_address: str = "0x0000000000000000000000000000000000000000"
    backend_wallet_private_key: str = "0x" + "0" * 64
    backend_wallet_address: str = "0x0000000000000000000000000000000000000000"

    # Legacy (productie met USDC escrow)
    auction_manager_address: str = "0x0000000000000000000000000000000000000000"
    bid_escrow_address: str = "0x0000000000000000000000000000000000000000"
    kyc_gate_address: str = "0x0000000000000000000000000000000000000000"
    usdc_address: str = "0x0000000000000000000000000000000000000000"

    idin_mock: bool = True
    frontend_url: str = "http://localhost:5173"


settings = Settings()
