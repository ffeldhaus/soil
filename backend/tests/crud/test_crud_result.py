import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone, timedelta # Added timedelta

from google.cloud.firestore_v1.document import DocumentReference, DocumentSnapshot
from google.cloud.firestore_v1.async_query import AsyncQuery # Correct import

from app.crud.crud_result import CRUDResult, RESULT_COLLECTION_NAME_TEMPLATE
from app.schemas.result import ResultCreate, ResultInDB
from app.schemas.financials import HarvestIncome, TotalIncome, TotalExpensesBreakdown, SeedCosts, RunningCosts, InvestmentCosts
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
        income_details=TotalIncome(
            harvest_income=HarvestIncome(wheat=4500.0, total=4500.0), # Example crop
            bonuses=500.0,
            grand_total=5000.0
        ),
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
        income_details=TotalIncome(
            harvest_income=HarvestIncome(barley=3800.0, total=3800.0), # Example crop
            bonuses=200.0,
            grand_total=4000.0
        ),
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
        income_details=TotalIncome(
            harvest_income=HarvestIncome(corn=5000.0, total=5000.0), # Example crop
            bonuses=500.0,
            grand_total=5500.0
        ),
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
    assert set_data["income_details"]["harvest_income"]["wheat"] == result_create_obj_round1_player1.income_details.harvest_income.wheat
    assert set_data["income_details"]["bonuses"] == result_create_obj_round1_player1.income_details.bonuses
    # Update assertions for expense_details structure
    assert isinstance(set_data["expense_details"], dict)
    assert set_data["expense_details"]["seed_costs"]["total"] == result_create_obj_round1_player1.expense_details.seed_costs.total
    assert set_data["expense_details"]["running_costs"]["fertilizer"] == result_create_obj_round1_player1.expense_details.running_costs.fertilizer
    assert set_data["calculated_at"] == FIXED_DATETIME_RESULT
    assert set_data["id"] == mock_result_doc_ref.id
    # Assert data integrity fields
    assert set_data["market_demand_multiplier"] == result_create_obj_round1_player1.market_demand_multiplier
    assert set_data["environmental_score"] == result_create_obj_round1_player1.environmental_score
    assert set_data["total_yield"] == result_create_obj_round1_player1.total_yield
    assert set_data["total_revenue"] == result_create_obj_round1_player1.total_revenue
    assert set_data["total_expenses_sum"] == result_create_obj_round1_player1.total_expenses_sum

    assert isinstance(created_result, ResultInDB) # create_player_round_result returns ResultInDB
    assert created_result.id == mock_result_doc_ref.id
    assert created_result.player_id == result_create_obj_round1_player1.player_id
    assert created_result.game_id == result_create_obj_round1_player1.game_id
    assert created_result.round_number == result_create_obj_round1_player1.round_number
    assert created_result.profit_or_loss == result_create_obj_round1_player1.profit_or_loss
    assert created_result.calculated_at == FIXED_DATETIME_RESULT
    assert created_result.expense_details.seed_costs.total == result_create_obj_round1_player1.expense_details.seed_costs.total
    assert created_result.income_details.harvest_income.wheat == result_create_obj_round1_player1.income_details.harvest_income.wheat
    assert created_result.income_details.bonuses == result_create_obj_round1_player1.income_details.bonuses
    assert created_result.market_demand_multiplier == result_create_obj_round1_player1.market_demand_multiplier
    assert created_result.environmental_score == result_create_obj_round1_player1.environmental_score
    assert created_result.total_yield == result_create_obj_round1_player1.total_yield
    assert created_result.total_revenue == result_create_obj_round1_player1.total_revenue
    assert created_result.total_expenses_sum == result_create_obj_round1_player1.total_expenses_sum
    assert created_result.parcel_results == result_create_obj_round1_player1.parcel_results


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

    # Comprehensive assertions for all fields
    assert result.id == mock_result_doc_ref.id
    assert result.game_id == result_create_obj_round1_player1.game_id
    assert result.player_id == result_create_obj_round1_player1.player_id
    assert result.round_number == result_create_obj_round1_player1.round_number
    assert result.calculated_at == FIXED_DATETIME_RESULT

    # Data integrity fields
    assert result.market_demand_multiplier == result_create_obj_round1_player1.market_demand_multiplier
    assert result.environmental_score == result_create_obj_round1_player1.environmental_score
    assert result.total_yield == result_create_obj_round1_player1.total_yield
    assert result.total_revenue == result_create_obj_round1_player1.total_revenue
    assert result.total_expenses_sum == result_create_obj_round1_player1.total_expenses_sum
    assert result.profit_or_loss == result_create_obj_round1_player1.profit_or_loss

    # Nested models - assuming create_mock_snapshot sets these up as dicts
    # and ResultInDB parses them into Pydantic models.
    assert isinstance(result.income_details, TotalIncome)
    assert result.income_details.harvest_income.wheat == result_create_obj_round1_player1.income_details.harvest_income.wheat
    assert result.income_details.bonuses == result_create_obj_round1_player1.income_details.bonuses

    assert isinstance(result.expense_details, TotalExpensesBreakdown)
    assert result.expense_details.seed_costs.total == result_create_obj_round1_player1.expense_details.seed_costs.total
    assert result.expense_details.running_costs.fertilizer == result_create_obj_round1_player1.expense_details.running_costs.fertilizer
    # Add more checks for other nested fields in expense_details if necessary

    assert result.parcel_results == result_create_obj_round1_player1.parcel_results

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
    mock_snapshot2 = create_mock_snapshot(result_create_obj_round2_player1, doc_id2, FIXED_DATETIME_RESULT + timedelta(minutes=1)) # Use imported timedelta


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

    # Result 1 assertions (Round 1)
    res1 = results[0]
    assert res1.id == doc_id1
    assert res1.player_id == TEST_PLAYER_ID
    assert res1.round_number == TEST_ROUND_NUMBER
    assert res1.profit_or_loss == result_create_obj_round1_player1.profit_or_loss
    assert res1.calculated_at == FIXED_DATETIME_RESULT
    assert res1.market_demand_multiplier == result_create_obj_round1_player1.market_demand_multiplier
    assert res1.environmental_score == result_create_obj_round1_player1.environmental_score
    assert res1.total_yield == result_create_obj_round1_player1.total_yield
    assert res1.income_details.harvest_income.wheat == result_create_obj_round1_player1.income_details.harvest_income.wheat
    assert res1.income_details.bonuses == result_create_obj_round1_player1.income_details.bonuses
    assert res1.expense_details.seed_costs.total == result_create_obj_round1_player1.expense_details.seed_costs.total

    # Result 2 assertions (Round 2)
    res2 = results[1]
    assert res2.id == doc_id2
    assert res2.player_id == TEST_PLAYER_ID
    assert res2.round_number == TEST_ROUND_NUMBER_2
    assert res2.profit_or_loss == result_create_obj_round2_player1.profit_or_loss
    assert res2.calculated_at == FIXED_DATETIME_RESULT + timedelta(minutes=1) # As per mock_snapshot2
    assert res2.market_demand_multiplier == result_create_obj_round2_player1.market_demand_multiplier
    assert res2.environmental_score == result_create_obj_round2_player1.environmental_score
    assert res2.total_yield == result_create_obj_round2_player1.total_yield
    assert res2.income_details.harvest_income.barley == result_create_obj_round2_player1.income_details.harvest_income.barley # Assuming barley for player 2
    assert res2.income_details.bonuses == result_create_obj_round2_player1.income_details.bonuses
    assert res2.expense_details.seed_costs.total == result_create_obj_round2_player1.expense_details.seed_costs.total

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
async def test_get_player_round_result_not_found_calls_real_helper(
    crud_result_instance: CRUDResult,
    mock_firestore_db: MagicMock, # Main DB mock
):
    # This test ensures _get_result_doc_ref is covered.
    # We are NOT patching _get_result_doc_ref here.

    GAME_ID = "game-for-real-helper"
    PLAYER_ID = "player-for-real-helper"
    ROUND_NUMBER = 1

    # Expected collection path and doc_id that _get_result_doc_ref will construct
    expected_collection_path = RESULT_COLLECTION_NAME_TEMPLATE.format(game_id=GAME_ID)
    expected_doc_id = f"{PLAYER_ID}_round_{ROUND_NUMBER}_result"

    # Mock the call chain that the real _get_result_doc_ref will make
    mock_collection_object = AsyncMock(spec=MagicMock) # What db.collection() returns
    mock_doc_ref_object = AsyncMock(spec=DocumentReference) # What collection.document() returns

    # Configure db.collection(expected_collection_path) to return our mock_collection_object
    def collection_side_effect(path_called):
        if path_called == expected_collection_path:
            return mock_collection_object
        return AsyncMock() # Default for other calls
    mock_firestore_db.collection = MagicMock(side_effect=collection_side_effect)

    # Configure mock_collection_object.document(expected_doc_id) to return mock_doc_ref_object
    def document_side_effect(doc_id_called):
        if doc_id_called == expected_doc_id:
            return mock_doc_ref_object
        return AsyncMock()
    mock_collection_object.document = MagicMock(side_effect=document_side_effect)

    # Configure mock_doc_ref_object.get() to return a snapshot with exists = False
    mock_snapshot_not_found = MagicMock(spec=DocumentSnapshot)
    mock_snapshot_not_found.exists = False
    mock_doc_ref_object.get = AsyncMock(return_value=mock_snapshot_not_found)

    result = await crud_result_instance.get_player_round_result(
        db=mock_firestore_db, game_id=GAME_ID, player_id=PLAYER_ID, round_number=ROUND_NUMBER
    )

    assert result is None
    # Verify that the collection and document calls were made as expected by _get_result_doc_ref
    mock_firestore_db.collection.assert_called_with(expected_collection_path)
    mock_collection_object.document.assert_called_with(expected_doc_id)
    mock_doc_ref_object.get.assert_called_once()

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
    # Order is not guaranteed by this query, so check for presence by iterating
    expected_results_map = {
        doc_id1: result_create_obj_round1_player1,
        doc_id2: result_create_obj_round1_player2
    }
    assert len(results) == len(expected_results_map)

    for res in results:
        assert res.id in expected_results_map
        expected_obj = expected_results_map[res.id]

        assert res.player_id == expected_obj.player_id
        assert res.round_number == TEST_ROUND_NUMBER # All results are for this round
        assert res.profit_or_loss == expected_obj.profit_or_loss
        assert res.calculated_at == FIXED_DATETIME_RESULT # Both snapshots used same time
        assert res.market_demand_multiplier == expected_obj.market_demand_multiplier
        assert res.environmental_score == expected_obj.environmental_score
        assert res.total_yield == expected_obj.total_yield
        # Example: Accessing a dynamic field from HarvestIncome; requires careful fixture setup
        # For simplicity, let's assume the first crop set in HarvestIncome is what we check.
        # This might need adjustment based on how HarvestIncome is structured and populated.
        # If only one crop is ever set in these test fixtures for harvest_income:
        if expected_obj.income_details.harvest_income.wheat > 0:
             assert res.income_details.harvest_income.wheat == expected_obj.income_details.harvest_income.wheat
        elif expected_obj.income_details.harvest_income.corn > 0: # Adjusted for player2 example
             assert res.income_details.harvest_income.corn == expected_obj.income_details.harvest_income.corn
        # Add more elif for other crops as needed by fixture data
        assert res.income_details.bonuses == expected_obj.income_details.bonuses
        assert res.expense_details.seed_costs.total == expected_obj.expense_details.seed_costs.total

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
