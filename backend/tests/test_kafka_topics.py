from services.kafka_topics import (
    BLOCKCHAIN_AUCTION_EVENTS,
    BLOCKCHAIN_BID_CONFIRMED,
    BLOCKCHAIN_BID_SUBMIT,
)


def test_topic_names():
    assert BLOCKCHAIN_BID_SUBMIT == "blockchain.bid.submit"
    assert BLOCKCHAIN_BID_CONFIRMED == "blockchain.bid.confirmed"
    assert BLOCKCHAIN_AUCTION_EVENTS == "blockchain.auction.events"


def test_topics_are_unique():
    topics = [
        BLOCKCHAIN_BID_SUBMIT,
        BLOCKCHAIN_BID_CONFIRMED,
        BLOCKCHAIN_AUCTION_EVENTS,
    ]
    assert len(set(topics)) == len(topics)


def test_topics_use_dot_notation():
    topics = [
        BLOCKCHAIN_BID_SUBMIT,
        BLOCKCHAIN_BID_CONFIRMED,
        BLOCKCHAIN_AUCTION_EVENTS,
    ]
    for topic in topics:
        assert "." in topic
        assert topic.startswith("blockchain.")
