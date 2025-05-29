import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_query import AsyncQuery # Correct import

from app.crud.crud_result import CRUDResult, RESULT_COLLECTION_NAME_TEMPLATE
from app.schemas.result import ResultCreate, ResultInDB, TotalIncome
from app.schemas.financials import TotalExpensesBreakdown # Import correct schema
from app.schemas.game import GameStatus

# --- Constants ---
TEST_GAME_ID = "test-game-r1"
TEST_PLAYER_ID = "player-r1"
TEST_PLAYER_ID_2 = "player-r2"
TEST_ROUND_NUMBER = 1
TEST_ROUND_NUMBER_2 = 2
FIXED_DATETIME_RESULT = datetime(2023, 10, 26, 12, 0, 0, tzinfo=timezone.utc)

# --- Fixtures ---

@pytest.fixture
def crud_result_instance() -> CRUDResult:
    return CRUDResult(model_schema=ResultInDB)

@pytest.fixture
def result_create_obj_round1_player1() -> ResultCreate: # Renamed for clarity
    return ResultCreate(
        game_id=TEST_GAME_ID,
        player_id=TEST_PLAYER_ID,
        round_number=TEST_ROUND_NUMBER,
        market_demand_multiplier=1.1,
        environmental_score=85.5,
        total_yield=1000.0,
        total_revenue=5000.0,
        total_expenses_sum=2500.0,
        profit_or_loss=2500.0, # Changed net_profit to profit_or_loss
        income_details=TotalIncome(crop_sales=4500.0, bonuses=500.0),
        expense_details=TotalExpensesBreakdown( # Corrected type
            seed_costs=SeedCosts(total=500.0), # Mapped seeds to seed_costs.total
            running_costs=RunningCosts(
                fertilizer=300.0, 
                pesticides=200.0, 
                base_operational_costs=100.0 + 1000.0 + 400.0 # water + labor + maintenance
            ),
            investment_costs=InvestmentCosts(total=0.0), # Default or map if available
            grand_total=2500.0 # This should match total_expenses_sum
        ),
        parcel_results=[]
    )

@pytest.fixture
def result_create_obj_round2_player1() -> ResultCreate: # Another result for the same player
    return ResultCreate(
        game_id=TEST_GAME_ID,
        player_id=TEST_PLAYER_ID,
        round_number=TEST_ROUND_NUMBER_2,
        market_demand_multiplier=1.0,
        environmental_score=80.0,
        total_yield=900.0,
        total_revenue=4000.0,
        total_expenses_sum=2200.0,
        profit_or_loss=1800.0, # Changed net_profit to profit_or_loss
        income_details=TotalIncome(crop_sales=3800.0, bonuses=200.0),
        expense_details=TotalExpensesBreakdown( # Corrected type
            seed_costs=SeedCosts(total=450.0),
            running_costs=RunningCosts(
                fertilizer=250.0, 
                pesticides=150.0, 
                base_operational_costs=100.0 + 900.0 + 350.0 # water + labor + maintenance
            ),
            investment_costs=InvestmentCosts(total=0.0),
            grand_total=2200.0
        ),
        parcel_results=[]
    )

@pytest.fixture
def result_create_obj_round1_player2() -> ResultCreate: # Result for a different player, same round
    return ResultCreate(
        game_id=TEST_GAME_ID,
        player_id=TEST_PLAYER_ID_2,
        round_number=TEST_ROUND_NUMBER,
        market_demand_multiplier=1.2,
        environmental_score=90.0,
        total_yield=1100.0,
        total_revenue=5500.0,
        total_expenses_sum=2600.0,
        profit_or_loss=2900.0, # Changed net_profit to profit_or_loss
        income_details=TotalIncome(crop_sales=5000.0, bonuses=500.0),
        expense_details=TotalExpensesBreakdown( # Corrected type
            seed_costs=SeedCosts(total=550.0),
            running_costs=RunningCosts(
                fertilizer=320.0, 
                pesticides=210.0, 
                base_operational_costs=110.0 + 1050.0 + 410.0 # water + labor + maintenance
            ),
            investment_costs=InvestmentCosts(total=0.0),
            grand_total=2600.0
        ),
        parcel_results=[]
    )


@pytest.fixture
def mock_result_doc_ref(result_create_obj_round1_player1: ResultCreate) -> MagicMock: # Added specific obj for default ID
    mock_ref = MagicMock(spec=DocumentReference)
    # Default ID based on player1, round1
    mock_ref.id = f"{result_create_obj_round1_player1.player_id}_round_{result_create_obj_round1_player1.round_number}_result"
    mock_ref.set = AsyncMock()
    mock_ref.get = AsyncMock()
    return mock_ref

def create_mock_snapshot(result_obj: ResultCreate, doc_id: str, calculated_at: datetime) -> MagicMock:
    snapshot = MagicMock(spec=DocumentSnapshot)
    snapshot.exists = True
    data = result_obj.model_dump()
    data["id"] = doc_id
    data["calculated_at"] = calculated_at # Expecting datetime for model parsing
    # Ensure nested models are dicts if that's what to_dict() returns
    data["income_details"] = result_obj.income_details.model_dump()
    data["expense_details"] = result_obj.expense_details.model_dump()
    snapshot.to_dict.return_value = data
    snapshot.id = doc_id
    return snapshot

# --- Test Cases ---

@pytest.mark.asyncio
async def test_create_player_round_result(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock, 
    result_create_obj_round1_player1: ResultCreate, # Use specific fixture
    mock_result_doc_ref: MagicMock
):
    with patch.object(CRUDResult, "_get_result_doc_ref", return_value=mock_result_doc_ref) as mock_get_ref, \
         patch("app.crud.crud_result.datetime") as mock_datetime:
        mock_datetime.now.return_value = FIXED_DATETIME_RESULT
        mock_datetime.UTC = timezone.utc # Ensure datetime.UTC is available if used by SUT

        created_result = await crud_result_instance.create_player_round_result(
            db=mock_firestore_db, obj_in=result_create_obj_round1_player1
        )

    mock_get_ref.assert_called_once_with(
        mock_firestore_db,
        result_create_obj_round1_player1.game_id,
        result_create_obj_round1_player1.player_id,
        result_create_obj_round1_player1.round_number
    )
    mock_result_doc_ref.set.assert_called_once()
    call_args, _ = mock_result_doc_ref.set.call_args
    set_data = call_args[0]

    assert set_data["game_id"] == result_create_obj_round1_player1.game_id
    assert set_data["player_id"] == result_create_obj_round1_player1.player_id
    assert set_data["profit_or_loss"] == result_create_obj_round1_player1.profit_or_loss # Changed
    assert isinstance(set_data["income_details"], dict)
    assert set_data["income_details"]["crop_sales"] == result_create_obj_round1_player1.income_details.crop_sales
    # Update assertions for expense_details structure
    assert isinstance(set_data["expense_details"], dict)
    assert set_data["expense_details"]["seed_costs"]["total"] == result_create_obj_round1_player1.expense_details.seed_costs.total
    assert set_data["expense_details"]["running_costs"]["fertilizer"] == result_create_obj_round1_player1.expense_details.running_costs.fertilizer
    assert set_data["calculated_at"] == FIXED_DATETIME_RESULT
    assert set_data["id"] == mock_result_doc_ref.id

    assert isinstance(created_result, ResultInDB) # create_player_round_result returns ResultInDB
    assert created_result.id == mock_result_doc_ref.id
    assert created_result.profit_or_loss == result_create_obj_round1_player1.profit_or_loss # Changed
    assert created_result.calculated_at == FIXED_DATETIME_RESULT # Pydantic model has datetime object
    assert created_result.expense_details.seed_costs.total == result_create_obj_round1_player1.expense_details.seed_costs.total

@pytest.mark.asyncio
async def test_get_player_round_result_found(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock,
    mock_result_doc_ref: MagicMock,
    result_create_obj_round1_player1: ResultCreate
):
    mock_snapshot = create_mock_snapshot(result_create_obj_round1_player1, mock_result_doc_ref.id, FIXED_DATETIME_RESULT)
    # Pydantic model expects datetime obj for calculated_at, but Firestore to_dict might return ISO string
    # The create_mock_snapshot helper already sets calculated_at as datetime object in the dict it returns
    # so that CRUDBase can parse it directly.
    # If Firestore to_dict() returns ISO string, CRUDBase needs to handle parsing.
    # For this test, create_mock_snapshot returns datetime object for calculated_at.
    mock_result_doc_ref.get = AsyncMock(return_value=mock_snapshot)


    with patch.object(CRUDResult, "_get_result_doc_ref", return_value=mock_result_doc_ref) as mock_get_ref:
        result = await crud_result_instance.get_player_round_result(
            db=mock_firestore_db, game_id=TEST_GAME_ID, player_id=TEST_PLAYER_ID, round_number=TEST_ROUND_NUMBER
        )

    mock_get_ref.assert_called_once_with(mock_firestore_db, TEST_GAME_ID, TEST_PLAYER_ID, TEST_ROUND_NUMBER)
    assert isinstance(result, ResultInDB)
    assert result.id == mock_result_doc_ref.id
    assert result.profit_or_loss == result_create_obj_round1_player1.profit_or_loss # Changed
    assert result.calculated_at == FIXED_DATETIME_RESULT
    assert result.expense_details.seed_costs.total == result_create_obj_round1_player1.expense_details.seed_costs.total

@pytest.mark.asyncio
async def test_get_player_round_result_not_found(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock,
    mock_result_doc_ref: MagicMock
):
    mock_snapshot = MagicMock(spec=DocumentSnapshot)
    mock_snapshot.exists = False
    mock_result_doc_ref.get = AsyncMock(return_value=mock_snapshot)

    with patch.object(CRUDResult, "_get_result_doc_ref", return_value=mock_result_doc_ref) as mock_get_ref:
        result = await crud_result_instance.get_player_round_result(
            db=mock_firestore_db, game_id=TEST_GAME_ID, player_id=TEST_PLAYER_ID, round_number=TEST_ROUND_NUMBER
        )
    assert result is None

@pytest.mark.asyncio
async def test_get_all_results_for_player(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock,
    result_create_obj_round1_player1: ResultCreate,
    result_create_obj_round2_player1: ResultCreate
):
    # Arrange
    mock_collection_ref = mock_firestore_db.collection(RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID))
    mock_query = AsyncMock(spec=AsyncQuery) # Object returned by where().order_by().limit()
    mock_collection_ref.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query # Chain order_by
    mock_query.limit.return_value = mock_query    # Chain limit

    doc_id1 = f"{TEST_PLAYER_ID}_round_{TEST_ROUND_NUMBER}_result"
    doc_id2 = f"{TEST_PLAYER_ID}_round_{TEST_ROUND_NUMBER_2}_result"
    
    mock_snapshot1 = create_mock_snapshot(result_create_obj_round1_player1, doc_id1, FIXED_DATETIME_RESULT)
    # For second result, use a slightly different time if it matters, or same if not.
    mock_snapshot2 = create_mock_snapshot(result_create_obj_round2_player1, doc_id2, FIXED_DATETIME_RESULT + timezone.timedelta(minutes=1))


    async def stream_results_gen(*args, **kwargs):
        yield mock_snapshot1
        yield mock_snapshot2
    
    # query.stream is a sync method returning an async iterator
    mock_query.stream = MagicMock(return_value=stream_results_gen())

    # Act
    results = await crud_result_instance.get_all_results_for_player(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_id=TEST_PLAYER_ID, limit=10
    )

    # Assert
    mock_collection_ref.where.assert_called_once_with(field="player_id", op_string="==", value=TEST_PLAYER_ID)
    mock_query.order_by.assert_called_once_with("round_number")
    mock_query.limit.assert_called_once_with(10)
    
    assert len(results) == 2
    assert results[0].id == doc_id1
    assert results[0].round_number == TEST_ROUND_NUMBER
    assert results[1].id == doc_id2
    assert results[1].round_number == TEST_ROUND_NUMBER_2

@pytest.mark.asyncio
async def test_get_all_results_for_player_empty(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID))
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query

    async def stream_no_results_gen(*args, **kwargs):
        if False: yield
    mock_query.stream = MagicMock(return_value=stream_no_results_gen())

    results = await crud_result_instance.get_all_results_for_player(
        db=mock_firestore_db, game_id=TEST_GAME_ID, player_id="unknown_player", limit=10
    )
    assert len(results) == 0

@pytest.mark.asyncio
async def test_get_all_results_for_game_round(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock,
    result_create_obj_round1_player1: ResultCreate,
    result_create_obj_round1_player2: ResultCreate # Result from another player for the same round
):
    mock_collection_ref = mock_firestore_db.collection(RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID))
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query # query.where()

    doc_id1 = f"{TEST_PLAYER_ID}_round_{TEST_ROUND_NUMBER}_result"
    doc_id2 = f"{TEST_PLAYER_ID_2}_round_{TEST_ROUND_NUMBER}_result"

    mock_snapshot1 = create_mock_snapshot(result_create_obj_round1_player1, doc_id1, FIXED_DATETIME_RESULT)
    mock_snapshot2 = create_mock_snapshot(result_create_obj_round1_player2, doc_id2, FIXED_DATETIME_RESULT)


    async def stream_results_gen(*args, **kwargs):
        yield mock_snapshot1
        yield mock_snapshot2
    mock_query.stream = MagicMock(return_value=stream_results_gen())

    results = await crud_result_instance.get_all_results_for_game_round(
        db=mock_firestore_db, game_id=TEST_GAME_ID, round_number=TEST_ROUND_NUMBER
    )

    mock_collection_ref.where.assert_called_once_with(field="round_number", op_string="==", value=TEST_ROUND_NUMBER)
    assert len(results) == 2
    # Order is not guaranteed by this query, so check for presence
    result_ids = {res.id for res in results}
    assert doc_id1 in result_ids
    assert doc_id2 in result_ids
    player_ids = {res.player_id for res in results}
    assert TEST_PLAYER_ID in player_ids
    assert TEST_PLAYER_ID_2 in player_ids

@pytest.mark.asyncio
async def test_get_all_results_for_game_round_empty(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock
):
    mock_collection_ref = mock_firestore_db.collection(RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=TEST_GAME_ID))
    mock_query = AsyncMock(spec=AsyncQuery)
    mock_collection_ref.where.return_value = mock_query

    async def stream_no_results_gen(*args, **kwargs):
        if False: yield
    mock_query.stream = MagicMock(return_value=stream_no_results_gen())

    results = await crud_result_instance.get_all_results_for_game_round(
        db=mock_firestore_db, game_id=TEST_GAME_ID, round_number=3 # Assuming round 3 has no results
    )
    assert len(results) == 0
