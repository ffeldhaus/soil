# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 2018_08_20_191157) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "admins", force: :cascade do |t|
    t.string "name"
    t.string "password_digest"
    t.string "salt"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "expenses", force: :cascade do |t|
    t.integer "sum"
    t.bigint "result_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["result_id"], name: "index_expenses_on_result_id"
  end

  create_table "fields", force: :cascade do |t|
    t.boolean "submitted"
    t.bigint "round_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["round_id"], name: "index_fields_on_round_id"
  end

  create_table "games", force: :cascade do |t|
    t.integer "current_round"
    t.integer "number_of_rounds"
    t.string "name"
    t.string "weather"
    t.string "vermin"
    t.bigint "supervisor_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["supervisor_id"], name: "index_games_on_supervisor_id"
  end

  create_table "harvests", force: :cascade do |t|
    t.integer "sum"
    t.integer "fieldbean"
    t.integer "barley"
    t.integer "oat"
    t.integer "potato"
    t.integer "corn"
    t.integer "rye"
    t.integer "wheat"
    t.integer "beet"
    t.bigint "income_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["income_id"], name: "index_harvests_on_income_id"
  end

  create_table "incomes", force: :cascade do |t|
    t.integer "sum"
    t.bigint "result_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["result_id"], name: "index_incomes_on_result_id"
  end

  create_table "investments", force: :cascade do |t|
    t.integer "sum"
    t.integer "animals"
    t.integer "machines"
    t.bigint "expense_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_id"], name: "index_investments_on_expense_id"
  end

  create_table "parcels", force: :cascade do |t|
    t.integer "number"
    t.integer "nutrition"
    t.integer "soil"
    t.string "cropsequence"
    t.integer "harvest_yield"
    t.string "harvest"
    t.string "plantation"
    t.bigint "field_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["field_id"], name: "index_parcels_on_field_id"
  end

  create_table "players", force: :cascade do |t|
    t.string "name"
    t.string "password_digest"
    t.string "salt"
    t.bigint "game_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id"], name: "index_players_on_game_id"
  end

  create_table "results", force: :cascade do |t|
    t.integer "machines"
    t.boolean "organic"
    t.string "weather"
    t.string "vermin"
    t.integer "profit"
    t.integer "capital"
    t.string "player"
    t.bigint "round_id"
    t.bigint "previous_round_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["previous_round_id"], name: "index_results_on_previous_round_id"
    t.index ["round_id"], name: "index_results_on_round_id"
  end

  create_table "rounds", force: :cascade do |t|
    t.integer "number"
    t.boolean "submitted"
    t.boolean "confirmed"
    t.boolean "last"
    t.integer "machines"
    t.boolean "organic"
    t.boolean "pesticide"
    t.boolean "fertilize"
    t.boolean "organisms"
    t.bigint "player_id"
    t.bigint "game_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["game_id"], name: "index_rounds_on_game_id"
    t.index ["player_id"], name: "index_rounds_on_player_id"
  end

  create_table "running_costs", force: :cascade do |t|
    t.integer "sum"
    t.integer "organic_control"
    t.integer "fertilize"
    t.integer "pesticide"
    t.integer "organisms"
    t.integer "animals"
    t.integer "base"
    t.bigint "expense_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_id"], name: "index_running_costs_on_expense_id"
  end

  create_table "seeds", force: :cascade do |t|
    t.integer "sum"
    t.integer "fieldbean"
    t.integer "barley"
    t.integer "oat"
    t.integer "potato"
    t.integer "corn"
    t.integer "rye"
    t.integer "wheat"
    t.integer "beet"
    t.bigint "expense_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expense_id"], name: "index_seeds_on_expense_id"
  end

  create_table "supervisors", force: :cascade do |t|
    t.string "name"
    t.string "first_name"
    t.string "last_name"
    t.string "email"
    t.string "password_digest"
    t.string "salt"
    t.bigint "admin_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["admin_id"], name: "index_supervisors_on_admin_id"
  end

end
