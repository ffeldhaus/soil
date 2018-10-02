class RoundTrackerSerializer
  include FastJsonapi::ObjectSerializer

  attributes :id, :current_round
end
