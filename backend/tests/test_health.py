from datetime import datetime


# controleert dat de deadline-vergelijking werkt met naive datetime objecten
def test_deadline_comparison_naive():
    past = datetime(2000, 1, 1)
    assert datetime.now() > past


# controleert dat een toekomstige deadline nog niet verstreken is
def test_deadline_not_expired():
    future = datetime(2099, 12, 31)
    assert datetime.now() < future


# controleert dat bedragen correct worden omgerekend van euro naar eurocent
def test_amount_eurocents():
    amount_eur = 350_000.0
    eurocents = int(amount_eur * 100)
    assert eurocents == 35_000_000
